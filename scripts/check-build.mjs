import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outputDir = path.join(root, "dist");
const locales = ["zh-CN", "zh-TW", "en"];

const requiredFiles = [
  "index.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "feed.xml",
  "llms.txt",
  "llms-full.txt",
  "_headers",
  "zh-CN/index.html",
  "zh-CN/archive/index.html",
  "zh-CN/categories/index.html",
  "zh-CN/tags/index.html",
  "zh-CN/about/index.html"
];

const forbiddenFiles = [
  "assets/client.js",
  "assets/site.css",
  "assets/theme/default/client.js",
  "assets/theme/default/scripts/client.js",
  "sitemap-index.xml",
  "sitemap-0.xml",
  "sitemap/index.html"
];

const themeFiles = [
  "themes/default/style.css",
  "themes/default/theme.yml",
  "themes/default/templates/home.html",
  "themes/default/templates/archive.html",
  "themes/default/templates/terms-index.html",
  "themes/default/templates/terms-page.html",
  "themes/default/templates/page.html",
  "themes/default/scripts/consent.js",
  "themes/default/scripts/search.js",
  "themes/default/scripts/lightbox.js",
  "themes/default/scripts/media.js",
  "themes/default/scripts/comments.js",
  "themes/default/scripts/web-mcp.js"
];

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir, suffix) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath, suffix);
    return entry.isFile() && entryPath.endsWith(suffix) ? [entryPath] : [];
  }));
  return files.flat();
}

function fail(message) {
  console.error(`check-build: ${message}`);
  process.exitCode = 1;
}

for (const file of requiredFiles) {
  if (!(await exists(path.join(outputDir, file)))) fail(`missing dist/${file}`);
}

for (const file of themeFiles) {
  if (!(await exists(path.join(root, file)))) fail(`missing ${file}`);
}

for (const file of forbiddenFiles) {
  if (await exists(path.join(outputDir, file))) fail(`stale dist/${file}`);
  if (await exists(path.join(root, "static", file))) fail(`stale static/${file}`);
}

const sitemap = await readFile(path.join(outputDir, "sitemap.xml"), "utf8");
if (!sitemap.trimStart().startsWith("<?xml")) fail("sitemap.xml is missing XML declaration");
if (!sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
  fail("sitemap.xml is missing sitemap namespace");
}
if (sitemap.includes("<?xml-stylesheet")) fail("sitemap.xml should not include an XSL stylesheet");
if (sitemap.includes("<sitemapindex")) fail("sitemap.xml should be a urlset, not a sitemap index");
if (!sitemap.includes("<urlset")) fail("sitemap.xml is missing urlset root");
if (!sitemap.includes("<url>") || !sitemap.includes("<loc>https://blog.js.gripe/")) {
  fail("sitemap.xml does not contain expected absolute URLs");
}
if (!sitemap.includes("<loc>https://blog.js.gripe/zh-CN/posts/")) {
  fail("sitemap.xml does not contain article URLs");
}
if (!sitemap.includes("<loc>https://blog.js.gripe/zh-CN/about/")) {
  fail("sitemap.xml does not contain page URLs");
}
if (!sitemap.includes("<changefreq>")) fail("sitemap.xml is missing changefreq metadata");
if (!sitemap.includes("<priority>")) fail("sitemap.xml is missing priority metadata");

const headers = await readFile(path.join(outputDir, "_headers"), "utf8");
if (!headers.includes("Content-Type: text/xml; charset=utf-8")) {
  fail("_headers should serve XML files as text/xml");
}
if (/\/\*\.xml/.test(headers)) {
  fail("_headers should not use an overlapping /*.xml rule for sitemap.xml");
}
if (!headers.includes("Content-Type: text/markdown; charset=utf-8")) {
  fail("_headers should serve markdown mirrors as text/markdown");
}

const redirectsPath = path.join(outputDir, "_redirects");
if (await exists(redirectsPath)) {
  const redirects = await readFile(redirectsPath, "utf8");
  if (/\/\*\s+\/index\.html\s+200/.test(redirects)) {
    fail("_redirects contains a SPA fallback");
  }
}

const home = await readFile(path.join(outputDir, "zh-CN/index.html"), "utf8");
if (!home.includes("/assets/theme/default/style.css?v=")) fail("home page is missing theme CSS");
if (!home.includes("/assets/theme/default/styles/home.css?v=")) fail("home page is missing page CSS");
if (!home.includes("/assets/theme/default/scripts/consent.js?v=")) fail("home page is missing consent theme JS");
if (!home.includes("themeConsent")) fail("home page is missing consent config");
if (!home.includes("themeFeatureCategories")) fail("home page is missing feature consent categories");
if (!home.includes("data-consent-open")) fail("home page is missing consent preferences trigger");
if (home.includes("/assets/theme/default/scripts/client.js")) fail("home page still references client.js");
if (/<script\b[^>]+\bsrc=["'][^"']*comments\.js/.test(home)) fail("home page should not directly load comments.js");
if (home.includes("/assets/site.css") || home.includes("/assets/client.js")) {
  fail("home page still references legacy root assets");
}

const scriptTagMatches = home.match(/<script\b(?=[^>]*\ssrc=)[^>]*>/g) || [];
if (scriptTagMatches.length !== 1) {
  fail(`home page should directly load only the consent script, found ${scriptTagMatches.length}`);
}

const htmlFiles = await listFiles(outputDir, ".html");
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(outputDir, file);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${relative} is missing title`);
  if (!/<meta[^>]+name=["']description["'][^>]*>/i.test(html)) fail(`${relative} is missing description`);
  if (!/<main\b/i.test(html)) fail(`${relative} is missing main`);
}

for (const locale of locales) {
  const searchPage = path.join(outputDir, locale, "search", "index.html");
  const searchIndex = path.join(outputDir, "assets", `search-index.${locale}.json`);
  if (!(await exists(searchPage))) fail(`missing search page for ${locale}`);
  if (!(await exists(searchIndex))) fail(`missing search index for ${locale}`);
  if (await exists(searchIndex)) {
    const entries = JSON.parse(await readFile(searchIndex, "utf8"));
    if (!Array.isArray(entries)) fail(`search index for ${locale} must be an array`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`check-build: ok (${htmlFiles.length} HTML files)`);
