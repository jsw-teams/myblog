import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_SQUARE_IMAGE_SIZE = 600;
export const DEFAULT_OG_IMAGE = "/assets/og-default.jpg";

const generatedOgImages = new Map();
const ogManifests = new Map();

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

function manifestKey(src, contentKey) {
  return crypto.createHash("sha1").update(`${contentKey}\0${src}`).digest("hex");
}

function publicPathFor(src, publicDir) {
  if (!src || isRemoteUrl(src) || src.startsWith("//") || !src.startsWith("/")) return "";
  const pathname = new URL(src, "https://local.invalid").pathname;
  const decoded = decodeURIComponent(pathname.replace(/^\/+/, ""));
  const resolved = path.resolve(publicDir, decoded);
  if (!resolved.startsWith(path.resolve(publicDir))) return "";
  return resolved;
}

function manifestPath(publicDir) {
  return path.join(publicDir, "assets", "og", "manifest.json");
}

async function readOgManifest(publicDir) {
  const key = path.resolve(publicDir);
  if (ogManifests.has(key)) return ogManifests.get(key);

  const file = manifestPath(publicDir);
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    const manifest = parsed && typeof parsed === "object" ? parsed : {};
    manifest.images = manifest.images && typeof manifest.images === "object" ? manifest.images : {};
    ogManifests.set(key, manifest);
    return manifest;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not read OG image manifest ${file}: ${error.message}`);
    }
    const manifest = { version: 1, images: {} };
    ogManifests.set(key, manifest);
    return manifest;
  }
}

async function writeOgManifest(publicDir, manifest) {
  const file = manifestPath(publicDir);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function manifestEntryIsUsable(entry, publicDir) {
  if (!entry || typeof entry !== "object" || !entry.url) return false;
  const localPath = publicPathFor(entry.url, publicDir);
  return Boolean(localPath && fsSync.existsSync(localPath));
}

function manifestSquareEntryIsUsable(entry, publicDir) {
  if (!entry || typeof entry !== "object" || !entry.squareUrl) return false;
  const localPath = publicPathFor(entry.squareUrl, publicDir);
  return Boolean(localPath && fsSync.existsSync(localPath));
}

async function renderOgImage(source, outputPath, sharp) {
  // Normalize EXIF orientation once, then reuse identical pixels for both
  // layers. The blurred layer fills the social-card canvas while the sharp
  // foreground uses `contain`, ensuring that no part of the original cover is
  // cropped on Facebook, X, LinkedIn, Slack, or other 1200×630 previews.
  const normalized = await sharp(source).rotate().toBuffer();
  const background = await sharp(normalized)
    .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, {
      fit: "cover",
      position: "attention"
    })
    .blur(32)
    .modulate({ brightness: 0.58, saturation: 0.82 })
    .toBuffer();
  const foreground = await sharp(normalized)
    .ensureAlpha()
    .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  await sharp(background)
    .composite([{ input: foreground, blend: "over" }])
    .jpeg({
      quality: 86,
      mozjpeg: true
    })
    .toFile(outputPath);
}

async function renderSquareOgImage(source, outputPath, sharp) {
  // WeChat commonly renders external-link artwork as a square thumbnail. A
  // dedicated square composition keeps the complete cover visible instead of
  // relying on the client to center-crop the 1200×630 social card.
  const normalized = await sharp(source).rotate().toBuffer();
  const background = await sharp(normalized)
    .resize(OG_SQUARE_IMAGE_SIZE, OG_SQUARE_IMAGE_SIZE, {
      fit: "cover",
      position: "attention"
    })
    .blur(28)
    .modulate({ brightness: 0.56, saturation: 0.8 })
    .toBuffer();
  const foreground = await sharp(normalized)
    .ensureAlpha()
    .resize(OG_SQUARE_IMAGE_SIZE, OG_SQUARE_IMAGE_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  await sharp(background)
    .composite([{ input: foreground, blend: "over" }])
    .jpeg({
      quality: 86,
      mozjpeg: true
    })
    .toFile(outputPath);
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
    const manifest = await readOgManifest(publicDir);
    const key = manifestKey(src, contentKey);
    const existing = manifest.images[key];
    const hasLandscape = manifestEntryIsUsable(existing, publicDir);
    const hasSquare = manifestSquareEntryIsUsable(existing, publicDir);
    if (hasLandscape && hasSquare) {
      return {
        url: existing.url,
        width: existing.width || OG_IMAGE_WIDTH,
        height: existing.height || OG_IMAGE_HEIGHT,
        squareUrl: existing.squareUrl,
        squareWidth: existing.squareWidth || OG_SQUARE_IMAGE_SIZE,
        squareHeight: existing.squareHeight || OG_SQUARE_IMAGE_SIZE
      };
    }

    const source = await readImageSource(src, publicDir);
    if (!source) {
      return hasLandscape ? {
        url: existing.url,
        width: existing.width || OG_IMAGE_WIDTH,
        height: existing.height || OG_IMAGE_HEIGHT
      } : null;
    }

    const { default: sharp } = await import("sharp");
    const sourceHash = crypto.createHash("sha1").update(source).digest("hex").slice(0, 12);
    const urlDir = `/assets/og/${normalizedContentKey(contentKey)}`;
    const outputDir = path.join(publicDir, urlDir.replace(/^\/+/, ""));
    const filename = `${sourceHash}.jpg`;
    const squareFilename = `${sourceHash}-square.jpg`;

    await fs.mkdir(outputDir, { recursive: true });
    if (!hasLandscape) {
      await renderOgImage(source, path.join(outputDir, filename), sharp);
    }
    if (!hasSquare) {
      await renderSquareOgImage(source, path.join(outputDir, squareFilename), sharp);
    }

    const entry = {
      ...existing,
      url: hasLandscape ? existing.url : `${urlDir}/${filename}`,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      squareUrl: hasSquare ? existing.squareUrl : `${urlDir}/${squareFilename}`,
      squareWidth: OG_SQUARE_IMAGE_SIZE,
      squareHeight: OG_SQUARE_IMAGE_SIZE,
      contentKey,
      source: src
    };
    manifest.images[key] = entry;
    await writeOgManifest(publicDir, manifest);

    return {
      url: entry.url,
      width: entry.width,
      height: entry.height,
      squareUrl: entry.squareUrl,
      squareWidth: entry.squareWidth,
      squareHeight: entry.squareHeight
    };
  } catch (error) {
    console.warn(`Could not generate local OG image for ${src}: ${error.message}`);
    return null;
  }
}
