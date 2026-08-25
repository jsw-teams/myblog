import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "public");
const siteConfigPath = path.join(rootDir, "content", "site.config.json");

const siteConfig = JSON.parse(await fs.readFile(siteConfigPath, "utf8"));
const defaultSiteUrl = siteConfig.siteUrl;

if (!defaultSiteUrl) {
  throw new Error("content/site.config.json must define siteUrl as the default absolute origin");
}

const defaultOrigin = new URL(defaultSiteUrl).origin;

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=(['\"])(.*?)\\1`, "i"));
  return match?.[2] ?? "";
}

function rootRelativeIfDefaultOrigin(value) {
  if (!value) return value;
  try {
    const parsed = new URL(value);
    if (parsed.origin !== defaultOrigin) return value;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return value;
  }
}

function rewriteAttribute(tag, name) {
  return tag.replace(
    new RegExp(`\\b${name}=(['\"])(.*?)\\1`, "i"),
    (match, quote, value) => `${name}=${quote}${rootRelativeIfDefaultOrigin(value)}${quote}`
  );
}

function rewriteHostAwareMetadata(html) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = getAttribute(tag, "rel").toLowerCase();
    if (rel === "canonical") {
      return rewriteAttribute(tag, "href");
    }
    if (rel === "alternate" && getAttribute(tag, "hreflang")) {
      return rewriteAttribute(tag, "href");
    }
    return tag;
  });
}

const htmlFiles = await fg("**/*.html", {
  cwd: outputDir,
  onlyFiles: true,
  dot: true
});

let changedFiles = 0;
let canonicalCount = 0;
let hreflangCount = 0;

for (const relativePath of htmlFiles) {
  const filePath = path.join(outputDir, relativePath);
  const original = await fs.readFile(filePath, "utf8");
  const rewritten = rewriteHostAwareMetadata(original);

  canonicalCount += (rewritten.match(/<link\b[^>]*\brel=(['\"])canonical\1[^>]*\bhref=(['\"])\//gi) ?? []).length;
  hreflangCount += (rewritten.match(/<link\b[^>]*\brel=(['\"])alternate\1[^>]*\bhreflang=(['\"])[^'\"]+\2[^>]*\bhref=(['\"])\//gi) ?? []).length;

  if (rewritten !== original) {
    await fs.writeFile(filePath, rewritten, "utf8");
    changedFiles += 1;
  }
}

const remainingAbsoluteCanonical = [];
for (const relativePath of htmlFiles) {
  const html = await fs.readFile(path.join(outputDir, relativePath), "utf8");
  if (new RegExp(`<link\\b[^>]*\\brel=(['\"])canonical\\1[^>]*\\bhref=(['\"])${defaultOrigin.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`, "i").test(html)) {
    remainingAbsoluteCanonical.push(relativePath);
  }
}

if (remainingAbsoluteCanonical.length) {
  throw new Error(`Host-aware metadata rewrite failed for: ${remainingAbsoluteCanonical.join(", ")}`);
}

console.log(`[postbuild] host-aware metadata: ${changedFiles} HTML files rewritten, ${canonicalCount} canonical and ${hreflangCount} hreflang links now resolve against the request Host`);
