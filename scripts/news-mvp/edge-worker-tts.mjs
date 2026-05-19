#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

function splitText(text, maxChars) {
  const chunks = [];
  let current = "";
  for (const sentence of text.split(/(?<=[。！？；.!?;\n])\s*/).map((item) => item.trim()).filter(Boolean)) {
    if (!current) {
      current = sentence;
    } else if (current.length + sentence.length <= maxChars) {
      current += sentence;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function concatAudio(chunks, outputPath) {
  if (chunks.length === 1) {
    await execFileAsync("ffmpeg", [
      "-y",
      "-v", "error",
      "-i", chunks[0],
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      outputPath,
    ], { maxBuffer: 1024 * 1024 * 4 });
    return;
  }
  const listPath = `${outputPath}.concat.txt`;
  await fs.writeFile(listPath, chunks.map((chunk) => `file '${path.resolve(chunk).replaceAll("'", "'\\''")}'`).join("\n") + "\n", "utf8");
  await execFileAsync("ffmpeg", [
    "-y",
    "-v", "error",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    outputPath,
  ], { maxBuffer: 1024 * 1024 * 4 });
}

async function synthesizeChunk({ endpoint, text, voice, speed, pitch, style }) {
  const url = new URL("/v1/audio/speech", endpoint);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text, voice, speed, pitch, style }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Edge Worker TTS failed: HTTP ${response.status} ${body.slice(0, 300)}`);
  }
  const type = response.headers.get("content-type") || "";
  if (!type.includes("audio/") && !type.includes("application/octet-stream")) {
    const body = await response.text().catch(() => "");
    throw new Error(`Edge Worker TTS returned non-audio response: ${type} ${body.slice(0, 300)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  await loadLocalEnv();
  const inputPath = argValue("input");
  const outputPath = path.resolve(argValue("output") || "narration.edge.mp3");
  const endpoint = argValue("endpoint") || process.env.NEWS_TTS_ENDPOINT || process.env.EDGE_WORKER_TTS_ENDPOINT || "https://tts.wangwangit.com";
  const voice = argValue("voice") || process.env.NEWS_TTS_VOICE || "zh-CN-YunyangNeural";
  const speed = argValue("speed") || process.env.NEWS_TTS_SPEED || "0.94";
  const pitch = argValue("pitch") || process.env.NEWS_TTS_PITCH || "0";
  const style = argValue("style") || process.env.NEWS_TTS_STYLE || "newscast";
  const maxChars = Number(process.env.NEWS_TTS_MAX_CHARS || 1200);
  if (!inputPath) throw new Error("Missing --input=path");
  if (!endpoint) throw new Error("Missing NEWS_TTS_ENDPOINT or --endpoint=https://your-worker.example");

  const text = await fs.readFile(inputPath, "utf8");
  const chunks = splitText(text, maxChars);
  const tmpDir = `${outputPath}.chunks`;
  await fs.mkdir(tmpDir, { recursive: true });
  const files = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(tmpDir, `chunk-${String(i + 1).padStart(2, "0")}.mp3`);
    const audio = await synthesizeChunk({ endpoint, text: chunks[i], voice, speed, pitch, style });
    await fs.writeFile(chunkPath, audio);
    files.push(chunkPath);
  }
  await concatAudio(files, outputPath);
  console.log(`Rendered ${outputPath} with Edge Worker TTS ${voice}`);
}

await main();
