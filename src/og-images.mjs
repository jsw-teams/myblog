import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const generatedOgImages = new Map();

function normalizedContentKey(contentKey) {
  return String(contentKey || "page")
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function isRemoteUrl(src) {
  return /^https?:\/\//i.test(src);
}

function publicPathFor(src, publicDir) {
  if (!src || isRemoteUrl(src) || src.startsWith("//") || !src.startsWith("/")) return "";
  const pathname = new URL(src, "https://local.invalid").pathname;
  const decoded = decodeURIComponent(pathname.replace(/^\/+/, ""));
  const resolved = path.resolve(publicDir, decoded);
  if (!resolved.startsWith(path.resolve(publicDir))) return "";
  return resolved;
}

async function readImageSource(src, publicDir) {
  if (isRemoteUrl(src)) {
    if (process.env.OG_FETCH_REMOTE_COVERS !== "true") return null;

    const response = await fetch(src, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; blog.js.gripe OG image builder)"
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch OG source ${src}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  const localPath = publicPathFor(src, publicDir);
  if (!localPath || !fsSync.existsSync(localPath)) return null;
  return fs.readFile(localPath);
}

export async function makeOgImageFromCover(src, { publicDir, contentKey }) {
  if (!src) return null;

  const cacheKey = `${path.resolve(publicDir)}:${contentKey}:${src}`;
  if (generatedOgImages.has(cacheKey)) return generatedOgImages.get(cacheKey);

  const promise = makeOgImage(src, { publicDir, contentKey });
  generatedOgImages.set(cacheKey, promise);
  return promise;
}

async function makeOgImage(src, { publicDir, contentKey }) {
  try {
    const source = await readImageSource(src, publicDir);
    if (!source) return null;

    const { default: sharp } = await import("sharp");
    const sourceHash = crypto.createHash("sha1").update(source).digest("hex").slice(0, 12);
    const urlDir = `/assets/og/${normalizedContentKey(contentKey)}`;
    const outputDir = path.join(publicDir, urlDir.replace(/^\/+/, ""));
    const filename = `${sourceHash}.jpg`;

    await fs.mkdir(outputDir, { recursive: true });
    await sharp(source)
      .rotate()
      .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, {
        fit: "cover",
        position: "attention"
      })
      .jpeg({
        quality: 86,
        mozjpeg: true
      })
      .toFile(path.join(outputDir, filename));

    return {
      url: `${urlDir}/${filename}`,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT
    };
  } catch (error) {
    console.warn(`Could not generate local OG image for ${src}: ${error.message}`);
    return null;
  }
}
