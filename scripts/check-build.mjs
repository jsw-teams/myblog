#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const publicDir = path.join(rootDir, "public");
const publicAssetsDir = path.join(publicDir, "assets");
const contentAssetsDir = path.join(rootDir, "content", "assets");
const locales = ["zh-CN", "zh-TW", "en"];

function hasHeaderBlock(headers, pathPattern, headerPattern) {
  const blockPattern = new RegExp(`(?:^|\\n)${pathPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n(?<body>(?:\\s+[^\\n]+\\n?)+)`, "m");
  const body = headers.match(blockPattern)?.groups?.body ?? "";
  return headerPattern.test(body);
}

const required = ["index.html", "404.html", "sitemap.xml", "robots.txt", "_headers", "llms.txt"];
const missing = [];
for (const file of required) {
  if (!fsSync.existsSync(path.join(publicDir, file))) missing.push(file);
}
if (missing.length) throw new Error(`Missing required public files: ${missing.join(", ")}`);

const sitemap = await fs.readFile(path.join(publicDir, "sitemap.xml"), "utf8");
if (!sitemap.startsWith("<?xml")) {
  throw new Error("sitemap.xml must start with an XML declaration");
}
if (sitemap.includes("<?xml-stylesheet")) {
  throw new Error("sitemap.xml must use the browser-native XML viewer without XSLT");
}
if (!/<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(sitemap)) {
  throw new Error("sitemap.xml is missing the sitemap urlset namespace");
}
if (!/<url>\s*<loc>https:\/\/blog\.js\.gripe\//.test(sitemap)) {
  throw new Error("sitemap.xml does not contain absolute site URLs");
}
if (sitemap.includes("<xhtml:link")) {
  throw new Error("sitemap.xml must not include xhtml:link elements that break Chromium's native XML viewer");
}

const headers = await fs.readFile(path.join(publicDir, "_headers"), "utf8");
if (!hasHeaderBlock(headers, "/sitemap.xml", /^\s*Content-Type:\s*application\/xml;\s*charset=utf-8\s*$/im)) {
  throw new Error("_headers must serve /sitemap.xml as application/xml");
}
if (!hasHeaderBlock(headers, "/md/*", /^\s*Content-Type:\s*text\/markdown;\s*charset=utf-8\s*$/im)) {
  throw new Error("_headers must serve /md/* as text/markdown");
}
if (headers.includes("/markdown/*")) {
  throw new Error("_headers must not use the retired /markdown/* mirror path");
}

const redirects = await fs.readFile(path.join(publicDir, "_redirects"), "utf8");
if (/\/\*\s+\/index\.html\s+200/.test(redirects)) {
  throw new Error("_redirects contains a SPA fallback");
}

const leakTerms = ["README", "部署说明", "技术栈", "Cloudflare Pages 构建"];
const htmlFiles = await fg("**/*.html", { cwd: publicDir, onlyFiles: true });
for (const file of htmlFiles) {
  const html = await fs.readFile(path.join(publicDir, file), "utf8");
  for (const term of leakTerms) {
    if (html.includes(term)) throw new Error(`${file} contains internal term: ${term}`);
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) throw new Error(`${file} is missing title`);
  if (!/<meta[^>]+name=["']description["'][^>]*>/i.test(html)) throw new Error(`${file} is missing description`);
  if (!/<main\b/i.test(html)) throw new Error(`${file} is missing main`);
  if (/<script[^>]*\ssrc=["'][^"']*client(?:\.[a-f0-9]{12})?\.js/i.test(html)) {
    throw new Error(`${file} loads client.js before consent`);
  }
  if (!/<script[^>]*\ssrc=["'][^"']*consent(?:\.[a-f0-9]{12})?\.js/i.test(html)) {
    throw new Error(`${file} is missing the always-loaded consent entry`);
  }
  if (!/<script[^>]+type=["']text\/plain["'][^>]+data-consent-category=["']necessary["'][^>]+data-consent-src=["'][^"']*client(?:\.[a-f0-9]{12})?\.js/i.test(html)) {
    throw new Error(`${file} is missing the consent-gated client.js placeholder`);
  }
}

const assetManifest = JSON.parse(await fs.readFile(path.join(publicAssetsDir, "asset-manifest.json"), "utf8"));
for (const logicalName of ["site.css", "client.js", "consent.js"]) {
  const publicPath = assetManifest[logicalName];
  const extension = path.extname(logicalName).replace(".", "\\.");
  if (!new RegExp(`^/assets/${path.parse(logicalName).name}\\.[a-f0-9]{12}${extension}$`).test(publicPath || "")) {
    throw new Error(`Asset manifest has no content-hashed path for ${logicalName}`);
  }
  const asset = await fs.readFile(path.join(publicDir, publicPath.replace(/^\//, "")), "utf8");
  if (!asset.trim()) throw new Error(`Generated asset is empty: ${publicPath}`);
  if (/[\r\n]/.test(asset)) throw new Error(`Generated asset must be minified to one line: ${publicPath}`);
}

for (const file of [
  "icon-source.png",
  "og-default-source.png",
  "mascot-daily-actions.png",
  "mascot-emotions.png",
  "mascot-error-actions.png"
]) {
  if (!fsSync.existsSync(path.join(contentAssetsDir, file))) {
    throw new Error(`Missing source image in content/assets: ${file}`);
  }
}

for (const locale of locales) {
  const searchPage = path.join(publicDir, locale, "search", "index.html");
  const searchIndex = path.join(publicAssetsDir, `search-index.${locale}.json`);
  if (!fsSync.existsSync(searchPage)) throw new Error(`Missing search page for ${locale}`);
  if (!fsSync.existsSync(searchIndex)) throw new Error(`Missing search index for ${locale}`);
  const entries = JSON.parse(await fs.readFile(searchIndex, "utf8"));
  if (!Array.isArray(entries)) throw new Error(`Search index for ${locale} must be an array`);
}

const recoverySlug = "codex-desktop-browser-computer-use-sandbox-recovery";
const llms = await fs.readFile(path.join(publicDir, "llms.txt"), "utf8");
if (!/^#\s+\S.+$/m.test(llms) || !llms.startsWith("# ")) {
  throw new Error("llms.txt must start with exactly one Markdown H1 site title");
}
if (!/^>\s+\S.+$/m.test(llms)) {
  throw new Error("llms.txt must include a Markdown blockquote summary after its H1");
}
if (!/^- \[[^\]]+\]\(https:\/\/[^)]+\)(?:: .+)?$/m.test(llms)) {
  throw new Error("llms.txt must contain Markdown link-list entries");
}
if (llms.includes("/markdown/")) {
  throw new Error("llms.txt must not point at retired /markdown/ mirrors");
}
for (const locale of locales) {
  const markdownPath = path.join(publicDir, "md", locale, "posts", `${recoverySlug}.md`);
  if (!fsSync.existsSync(markdownPath)) {
    throw new Error(`Missing markdown mirror: /md/${locale}/posts/${recoverySlug}.md`);
  }
  const markdown = await fs.readFile(markdownPath, "utf8");
  if (!markdown.startsWith("# ")) {
    throw new Error(`Markdown mirror has invalid content: /md/${locale}/posts/${recoverySlug}.md`);
  }
  const publicUrl = `https://blog.js.gripe/md/${locale}/posts/${recoverySlug}.md`;
  if (!llms.includes(publicUrl)) {
    throw new Error(`llms.txt missing markdown mirror URL: ${publicUrl}`);
  }
}

console.log(`Checked ${htmlFiles.length} HTML files and required static outputs.`);
