#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const defaultAccountId = "7788f4e61842b04b43bf57a155d55725";

async function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  try {
    const text = await fs.readFile(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Local env is optional.
  }
}

function argValue(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : "";
}

function envValue(...names) {
  return names.map((name) => process.env[name]).find(Boolean) || "";
}

function splitText(text, maxChars) {
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
    } else if (current.length + paragraph.length + 2 <= maxChars) {
      current += `\n\n${paragraph}`;
    } else {
      chunks.push(current);
      current = paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function contentType(headers) {
  return headers.get("content-type") || "";
}

async function runWorkersAi({ accountId, token, model, payload }) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const type = contentType(response.headers);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Workers AI TTS failed: HTTP ${response.status} ${body}`);
  }

  if (type.includes("application/json")) {
    const json = await response.json();
    const audio = json?.result?.audio || json?.audio;
    if (!audio) throw new Error(`Workers AI TTS returned JSON without audio: ${JSON.stringify(json).slice(0, 300)}`);
    return Buffer.from(audio, "base64");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function concatMp3(chunks, outputPath) {
  const resolvedOutputPath = path.resolve(outputPath);
  const resolvedChunks = chunks.map((chunk) => path.resolve(chunk));
  if (chunks.length === 1) {
    await execFileAsync("ffmpeg", [
      "-y",
      "-v", "error",
      "-i", resolvedChunks[0],
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      resolvedOutputPath,
    ], { maxBuffer: 1024 * 1024 * 4 });
    return;
  }

  const listPath = `${resolvedOutputPath}.concat.txt`;
  const list = resolvedChunks.map((chunk) => `file '${chunk.replaceAll("'", "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, `${list}\n`, "utf8");
  await execFileAsync("ffmpeg", [
    "-y",
    "-v", "error",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    resolvedOutputPath,
  ], { maxBuffer: 1024 * 1024 * 4 });
}

async function main() {
  await loadLocalEnv();
  const inputPath = argValue("input");
  const outputPath = path.resolve(argValue("output") || "narration.mp3");
  const model = argValue("model") || process.env.WORKERS_AI_TTS_MODEL || "@cf/myshell-ai/melotts";
  const lang = argValue("lang") || process.env.WORKERS_AI_TTS_LANG || "ZH";
  const speaker = argValue("speaker") || process.env.WORKERS_AI_TTS_SPEAKER || "";
  const accountId = envValue("CLOUDFLARE_ACCOUNT_ID", "CF_ACCOUNT_ID", "WORKERS_AI_ACCOUNT_ID") || defaultAccountId;
  const token = envValue("CLOUDFLARE_API_TOKEN", "CF_API_TOKEN", "WORKERS_AI_API_TOKEN");

  if (!inputPath) throw new Error("Missing --input=path");
  if (!accountId || !token) {
    throw new Error("Missing CLOUDFLARE_ACCOUNT_ID/CF_ACCOUNT_ID and CLOUDFLARE_API_TOKEN/CF_API_TOKEN");
  }

  const text = await fs.readFile(inputPath, "utf8");
  const chunks = splitText(text, Number(process.env.WORKERS_AI_TTS_MAX_CHARS || 900));
  const tmpDir = `${outputPath}.chunks`;
  await fs.mkdir(tmpDir, { recursive: true });

  const chunkFiles = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(tmpDir, `chunk-${String(i + 1).padStart(2, "0")}.mp3`);
    const payload = model.includes("aura-1")
      ? { text: chunks[i], encoding: "mp3", ...(speaker ? { speaker } : {}) }
      : { prompt: chunks[i], lang };
    const audio = await runWorkersAi({ accountId, token, model, payload });
    await fs.writeFile(chunkPath, audio);
    chunkFiles.push(chunkPath);
  }

  await concatMp3(chunkFiles, outputPath);
  console.log(`Rendered ${outputPath} with ${model}`);
}

await main();
