#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPreviousTaipeiWeek } from "./lib/taipei-week.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(rootDir, "config/news-mvp.assets.json");

function argValue(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : "";
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(assetDir) {
  const entries = await fs.readdir(assetDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const itemPath = path.join(assetDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(itemPath)));
    } else if (entry.isFile()) {
      files.push(itemPath);
    }
  }
  return files.sort();
}

function classifyAsset(filePath, publicUrl) {
  const name = path.basename(filePath).toLowerCase();
  if (name.startsWith("cover.")) return ["cover", publicUrl];
  if (name === "weekly-world-news.mp4" || name.startsWith("weekly-world-news.")) return ["video", publicUrl];
  if (name.endsWith(".srt")) return ["captions", publicUrl];
  if (name.endsWith(".csv") || name.endsWith(".json") || name.endsWith(".md") || name.endsWith(".txt")) {
    return ["attachment", publicUrl];
  }
  return ["image", publicUrl];
}

async function uploadFiles({ uploadURL, sessionCookie, files }) {
  const form = new FormData();
  for (const filePath of files) {
    const bytes = await fs.readFile(filePath);
    const blob = new Blob([bytes]);
    form.append("files", blob, path.basename(filePath));
  }

  const headers = {};
  if (sessionCookie) headers.Cookie = sessionCookie;

  const response = await fetch(uploadURL, { method: "POST", headers, body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(`myfiles upload failed: HTTP ${response.status} ${payload.error || response.statusText}`);
  }
  return payload.items || [];
}

async function main() {
  const week = argValue("week") || process.env.NEWS_MVP_ASSET_WEEK || getPreviousTaipeiWeek().key;
  const assetDir = path.resolve(
    rootDir,
    argValue("dir") || process.env.NEWS_MVP_ASSET_DIR || `myfiles-assets/${week}`,
  );
  const publicBase = (process.env.MYFILES_PUBLIC_BASE || "https://files.js.gripe").replace(/\/$/, "");
  const uploadURL = process.env.MYFILES_UPLOAD_URL || `${publicBase}/api/upload`;
  const sessionCookie = process.env.MYFILES_SESSION_COOKIE || "";

  if (!(await pathExists(assetDir))) {
    throw new Error(`Asset directory does not exist: ${assetDir}`);
  }

  const files = await collectFiles(assetDir);
  if (files.length === 0) {
    throw new Error(`No asset files found in ${assetDir}`);
  }

  const items = await uploadFiles({ uploadURL, sessionCookie, files });
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const next = {
    ...(manifest[week] || {}),
    images: [...(manifest[week]?.images || [])],
    attachments: [...(manifest[week]?.attachments || [])],
  };

  for (const item of items) {
    if (!item.ok || !item.file?.publicUrl) continue;
    const sourcePath = files.find((filePath) => path.basename(filePath) === item.name) || item.name;
    const [kind, url] = classifyAsset(sourcePath, item.file.publicUrl);
    if (kind === "cover") next.cover = url;
    if (kind === "video") next.video = url;
    if (kind === "captions") next.captions = url;
    if (kind === "attachment" && !next.attachments.includes(url)) next.attachments.push(url);
    if (kind === "image" && !next.images.includes(url)) next.images.push(url);
  }

  manifest[week] = next;
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Updated ${path.relative(rootDir, manifestPath)} for ${week}`);
}

await main();
