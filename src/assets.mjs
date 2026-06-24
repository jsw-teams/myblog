import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_OG_IMAGE } from "./og-images.mjs";
import { readSiteConfig } from "./lib/content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "static");
const assetsDir = path.join(publicDir, "assets");
const cacheDir = path.join(rootDir, ".cache");
const basePath = "";

function withBase(urlPath) {
  if (!basePath || !urlPath.startsWith("/")) return urlPath;
  return `${basePath}${urlPath}`;
}

process.env.XDG_CACHE_HOME ??= cacheDir;
process.env.FONTCONFIG_CACHE ??= path.join(cacheDir, "fontconfig");

const { default: sharp } = await import("sharp");

let sourceFiles = {
  daily: path.join(rootDir, "source-assets", "mascot-daily-actions.png"),
  emotions: path.join(rootDir, "source-assets", "mascot-emotions.png"),
  error: path.join(rootDir, "source-assets", "mascot-error-actions.png")
};

const cropConfig = {
  daily: {
    grid: { columns: 3, rows: 2 },
    crops: {
      laptop: { left: 24, top: 188, width: 380, height: 408 },
      reading: { left: 430, top: 164, width: 392, height: 432 },
      writing: { left: 835, top: 176, width: 405, height: 420 }
    }
  },
  emotions: {
    grid: { columns: 4, rows: 3 },
    crops: {
      happy: { column: 2, row: 2 },
      thinking: { column: 1, row: 1 },
      sleeping: { column: 3, row: 2 }
    },
    favicon: { left: 55, top: 108, width: 245, height: 225 }
  },
  error: {
    grid: { columns: 3, rows: 2 },
    crops: {
      notFound: { column: 0, row: 0 }
    }
  }
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function configureThemeSourceFiles(site) {
  const themeName = site.theme?.name || "default";
  const themeSourceDir = path.join(rootDir, "themes", themeName, "source-assets");
  const legacySourceDir = path.join(rootDir, "source-assets");
  const sourceDir = fsSync.existsSync(themeSourceDir) ? themeSourceDir : legacySourceDir;
  sourceFiles = {
    daily: path.join(sourceDir, "mascot-daily-actions.png"),
    emotions: path.join(sourceDir, "mascot-emotions.png"),
    error: path.join(sourceDir, "mascot-error-actions.png")
  };
}

function hasSource(key) {
  return fsSync.existsSync(sourceFiles[key]);
}

async function readMetadata(key) {
  return sharp(sourceFiles[key]).metadata();
}

function cellExtract(metadata, grid, crop) {
  const cellWidth = Math.floor(metadata.width / grid.columns);
  const cellHeight = Math.floor(metadata.height / grid.rows);
  const left = crop.column * cellWidth;
  const top = crop.row * cellHeight;
  const width = crop.column === grid.columns - 1 ? metadata.width - left : cellWidth;
  const height = crop.row === grid.rows - 1 ? metadata.height - top : cellHeight;
  return { left, top, width, height };
}

function isConnectedBackgroundPixel(data, pixelIndex) {
  const offset = pixelIndex * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const alpha = data[offset + 3];
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  return alpha > 0 && red >= 132 && green >= 132 && blue >= 132 && brightest - darkest <= 82;
}

function removeEdgeConnectedBackground(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex) => {
    if (visited[pixelIndex] || !isConnectedBackgroundPixel(data, pixelIndex)) return;
    visited[pixelIndex] = 1;
    data[pixelIndex * 4 + 3] = 0;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x < width - 1) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y < height - 1) enqueue(pixelIndex + width);
  }
}

async function transparentCrop(sourceKey, extract) {
  const { data, info } = await sharp(sourceFiles[sourceKey])
    .extract(extract)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  removeEdgeConnectedBackground(data, info.width, info.height);
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  });
}

async function writeCrop(sourceKey, crop, outputName, width) {
  const output = path.join(assetsDir, outputName);
  if (!hasSource(sourceKey)) {
    if (fsSync.existsSync(output)) return;
    throw new Error(`Missing theme source asset: ${sourceFiles[sourceKey]}`);
  }
  const metadata = await readMetadata(sourceKey);
  const extract = crop.left == null
    ? cellExtract(metadata, cropConfig[sourceKey].grid, crop)
    : crop;
  await (await transparentCrop(sourceKey, extract))
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

async function makeIconPng(size, output, source = null) {
  if (!source && !hasSource("daily") && fsSync.existsSync(output)) return;
  const image = source
    ? sharp(source)
    : await transparentCrop("daily", cropConfig.daily.crops.laptop);
  await image
    .resize(size, size, {
      fit: "contain",
      position: "centre"
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

function icoFromPng(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory.writeUInt8(size >= 256 ? 0 : size, 0);
  directory.writeUInt8(size >= 256 ? 0 : size, 1);
  directory.writeUInt8(0, 2);
  directory.writeUInt8(0, 3);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(pngBuffer.length, 8);
  directory.writeUInt32LE(22, 12);

  return Buffer.concat([header, directory, pngBuffer]);
}

function resolveProjectPath(value) {
  if (!value) return "";
  const clean = String(value).replace(/^\/+/, "");
  return path.isAbsolute(value) ? value : path.join(rootDir, clean);
}

async function writeFavicon(site) {
  const iconSource = resolveProjectPath(site.icons?.source);
  const source = iconSource && fsSync.existsSync(iconSource) ? iconSource : null;
  if (!source && !hasSource("daily")) {
    const required = [
      path.join(publicDir, "favicon.ico"),
      path.join(publicDir, "favicon-32x32.png"),
      path.join(publicDir, "apple-touch-icon.png"),
      path.join(assetsDir, "icon-192.png"),
      path.join(assetsDir, "icon-512.png")
    ];
    if (required.every((file) => fsSync.existsSync(file))) return;
  }
  const favicon32 = path.join(publicDir, "favicon-32x32.png");
  await makeIconPng(32, favicon32, source);
  await makeIconPng(180, path.join(publicDir, "apple-touch-icon.png"), source);
  await makeIconPng(192, path.join(assetsDir, "icon-192.png"), source);
  await makeIconPng(512, path.join(assetsDir, "icon-512.png"), source);

  const pngBuffer = await fs.readFile(favicon32);
  await fs.writeFile(path.join(publicDir, "favicon.ico"), icoFromPng(pngBuffer, 32));
}

async function writeManifest(site) {
  const locale = site.defaultLocale || "zh-CN";
  const siteName = site.siteName?.[locale] || site.siteName?.en || "Blog";
  const manifest = {
    name: site.pwa?.name || siteName,
    short_name: site.pwa?.shortName || siteName,
    start_url: withBase("/"),
    display: "minimal-ui",
    background_color: site.pwa?.backgroundColor || "#f8f4ec",
    theme_color: site.pwa?.themeColor || "#141414",
    icons: [
      {
        src: withBase(site.icons?.icon192 || "/assets/icon-192.png"),
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: withBase(site.icons?.icon512 || "/assets/icon-512.png"),
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  await fs.writeFile(
    path.join(publicDir, "site.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
}

async function copyThemeFiles(site) {
  const themeName = site.theme?.name || "default";
  const themeDir = path.join(rootDir, "themes", themeName);
  const outputDir = path.join(assetsDir, "theme", themeName);
  await ensureDir(outputDir);

  const pageStyleFiles = Object.values(site.theme?.pageStyleFiles || {}).flat().filter(Boolean);
  const pageScriptFiles = Object.values(site.theme?.pageScriptFiles || {})
    .flat()
    .map((script) => typeof script === "string" ? script : script?.src)
    .filter((file) => file && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(String(file)));
  const featureScriptFiles = Object.values(site.theme?.featureScriptFiles || {})
    .filter((file) => file && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(String(file)));
  const featureStyleFiles = Object.values(site.theme?.featureStyleFiles || {}).flat().filter(Boolean);
  const files = [site.theme?.style, site.theme?.script, ...pageStyleFiles, ...pageScriptFiles, ...featureScriptFiles, ...featureStyleFiles].filter(Boolean);
  for (const file of files) {
    const source = path.join(themeDir, file);
    if (fsSync.existsSync(source)) {
      const target = path.join(outputDir, file);
      await ensureDir(path.dirname(target));
      await fs.copyFile(source, target);
    }
  }
}

async function writeOgImage() {
  if (!hasSource("daily")) {
    const outputs = [
      path.join(assetsDir, "og-default.png"),
      path.join(publicDir, DEFAULT_OG_IMAGE.replace(/^\/+/, ""))
    ];
    if (outputs.every((file) => fsSync.existsSync(file))) return;
    throw new Error(`Missing theme source asset: ${sourceFiles.daily}`);
  }
  const mascot = await (await transparentCrop("daily", cropConfig.daily.crops.reading))
    .resize({ width: 390 })
    .png()
    .toBuffer();

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#f8f4ec"/>
    <rect x="54" y="54" width="1092" height="522" rx="28" fill="#fffdfa" stroke="#241f1a" stroke-width="4"/>
    <circle cx="1042" cy="118" r="44" fill="#e6b352"/>
    <circle cx="988" cy="520" r="58" fill="#4d8f85"/>
    <rect x="92" y="138" width="360" height="42" rx="6" fill="#161616"/>
    <rect x="92" y="212" width="520" height="22" rx="4" fill="#2f6f68"/>
    <rect x="92" y="260" width="450" height="22" rx="4" fill="#d99a27"/>
    <rect x="92" y="346" width="78" height="78" rx="8" fill="#2f6f68"/>
    <rect x="190" y="346" width="78" height="78" rx="8" fill="#d99a27"/>
    <rect x="288" y="346" width="78" height="78" rx="8" fill="#b94b4b"/>
    <rect x="386" y="346" width="78" height="78" rx="8" fill="#241f1a"/>
    <path d="M92 486H560" stroke="#d7ccbd" stroke-width="16" stroke-linecap="round"/>
    <path d="M92 526H438" stroke="#d7ccbd" stroke-width="16" stroke-linecap="round"/>
  </svg>`;

  const image = sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: "#f8f4ec"
    }
  })
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: mascot, top: 152, left: 730 }
    ]);

  await image.clone()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assetsDir, "og-default.png"));

  await image.clone()
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(publicDir, DEFAULT_OG_IMAGE.replace(/^\/+/, "")));
}

export async function generateAssets() {
  const site = await readSiteConfig();
  configureThemeSourceFiles(site);
  await ensureDir(publicDir);
  await ensureDir(assetsDir);
  await ensureDir(process.env.FONTCONFIG_CACHE);
  await copyThemeFiles(site);

  await writeCrop("error", cropConfig.error.crops.notFound, "mascot-404.png", 520);
  await writeCrop("daily", cropConfig.daily.crops.reading, "mascot-reading.png", 420);
  await writeCrop("daily", cropConfig.daily.crops.writing, "mascot-writing.png", 420);
  await writeCrop("daily", cropConfig.daily.crops.laptop, "mascot-laptop.png", 420);
  await writeCrop("emotions", cropConfig.emotions.crops.happy, "mascot-happy.png", 300);
  await writeCrop("emotions", cropConfig.emotions.crops.thinking, "mascot-thinking.png", 300);
  await writeCrop("emotions", cropConfig.emotions.crops.sleeping, "mascot-sleeping.png", 300);

  await writeFavicon(site);
  await writeManifest(site);
  await writeOgImage();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAssets().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
