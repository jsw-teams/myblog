#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

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

function chineseCount(text) {
  return Array.from(text.matchAll(/\p{Script=Han}/gu)).length;
}

function repeatedTokenRatio(text) {
  const tokens = text.toLowerCase().match(/[a-z]{2,}|[\p{Script=Han}]/gu) || [];
  if (tokens.length < 12) return 0;
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return Math.max(...counts.values()) / tokens.length;
}

async function transcribe({ audioPath, accountId, token }) {
  const audio = await fs.readFile(audioPath);
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/openai/whisper`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: audio,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Whisper audit failed: HTTP ${response.status} ${body.slice(0, 300)}`);
  }
  const json = await response.json();
  return json?.result?.text || "";
}

async function main() {
  await loadLocalEnv();
  const audioPath = argValue("audio");
  const textPath = argValue("text");
  const transcriptPath = argValue("transcript");
  const accountId = envValue("CLOUDFLARE_ACCOUNT_ID", "CF_ACCOUNT_ID", "WORKERS_AI_ACCOUNT_ID") || defaultAccountId;
  const token = envValue("CLOUDFLARE_API_TOKEN", "CF_API_TOKEN", "WORKERS_AI_API_TOKEN");
  if (!audioPath) throw new Error("Missing --audio=path");
  if (!accountId || !token) throw new Error("Missing Cloudflare account/token for audio audit");

  const transcript = await transcribe({ audioPath, accountId, token });
  if (transcriptPath) await fs.writeFile(transcriptPath, `${transcript}\n`, "utf8");
  const source = textPath ? await fs.readFile(textPath, "utf8") : "";
  const sourceHan = chineseCount(source);
  const transcriptHan = chineseCount(transcript);
  const repeatRatio = repeatedTokenRatio(transcript);
  const ok = transcriptHan >= Math.min(8, Math.max(3, Math.floor(sourceHan * 0.08))) && repeatRatio < 0.45;
  console.log(JSON.stringify({ ok, transcriptHan, sourceHan, repeatRatio, transcript: transcript.slice(0, 240) }, null, 2));
  if (!ok) {
    throw new Error("Audio audit failed: transcript does not look like intelligible Chinese narration");
  }
}

await main();
