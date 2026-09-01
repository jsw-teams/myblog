import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { DEFAULT_OG_IMAGE } from "./og-images.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "static");
const assetsDir = path.join(publicDir, "assets");
const sourceDir = path.join(rootDir, "content", "assets");
const cacheDir = path.join(rootDir, ".cache");
const basePath = "";

function withBase(urlPath) {
  if (!basePath || !urlPath.startsWith("/")) return urlPath;
  return `${basePath}${urlPath}`;
}

process.env.XDG_CACHE_HOME ??= cacheDir;
process.env.FONTCONFIG_CACHE ??= path.join(cacheDir, "fontconfig");

const { default: sharp } = await import("sharp");

const sourceFiles = {
  daily: path.join(sourceDir, "mascot-daily-actions.png"),
  emotions: path.join(sourceDir, "mascot-emotions.png"),
  error: path.join(sourceDir, "mascot-error-actions.png"),
  icon: path.join(sourceDir, "icon-source.png"),
  og: path.join(sourceDir, "og-default-source.png")
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
  const metadata = await readMetadata(sourceKey);
  const extract = crop.left == null
    ? cellExtract(metadata, cropConfig[sourceKey].grid, crop)
    : crop;
  await (await transparentCrop(sourceKey, extract))
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assetsDir, outputName));
}

async function makeIconPng(size, output) {
  await sharp(sourceFiles.icon)
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

async function writeFavicon() {
  const favicon32 = path.join(publicDir, "favicon-32x32.png");
  await makeIconPng(32, favicon32);
  await makeIconPng(180, path.join(publicDir, "apple-touch-icon.png"));
  await makeIconPng(192, path.join(assetsDir, "icon-192.png"));
  await makeIconPng(512, path.join(assetsDir, "icon-512.png"));

  const pngBuffer = await fs.readFile(favicon32);
  await fs.writeFile(path.join(publicDir, "favicon.ico"), icoFromPng(pngBuffer, 32));
}

async function writeManifest() {
  const manifest = {
    name: "技述 Blog",
    short_name: "技述",
    start_url: withBase("/"),
    display: "minimal-ui",
    background_color: "#f8f4ec",
    theme_color: "#141414",
    icons: [
      {
        src: withBase("/assets/icon-192.png"),
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: withBase("/assets/icon-512.png"),
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

async function copyBaseFiles() {
  const files = [
    [[path.join(rootDir, "src", "styles.css"), path.join(rootDir, "theme", "styles", "support-card.css"), path.join(rootDir, "node_modules", "katex", "dist", "katex.min.css"), path.join(rootDir, "node_modules", "markdown-it-texmath", "css", "texmath.css")], "site.css", "css"],
    [[path.join(rootDir, "src", "client.js")], "client.js", "js"],
    [[path.join(rootDir, "src", "consent.js")], "consent.js", "js"]
  ];
  const staleAssets = await fs.readdir(assetsDir);
  await Promise.all(staleAssets
    .filter((file) => /^(?:site|client|consent)(?:\.[a-f0-9]{12})?\.(?:css|js)$/.test(file))
    .map((file) => fs.rm(path.join(assetsDir, file), { force: true })));
  const manifest = {};
  await Promise.all(files.map(async ([sources, output, loader]) => {
    const input = (await Promise.all(sources.map((source) => fs.readFile(source, "utf8")))).join("\n");
    const result = await transform(input, {
      legalComments: "none",
      loader,
      minify: true,
      target: loader === "js" ? "es2018" : undefined
    });
    const content = result.code.trim();
    const parsed = path.parse(output);
    const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
    const hashedName = `${parsed.name}.${hash}${parsed.ext}`;
    manifest[output] = `/assets/${hashedName}`;
    await fs.writeFile(path.join(assetsDir, hashedName), content, "utf8");
  }));
  await fs.cp(path.join(rootDir, "node_modules", "katex", "dist", "fonts"), path.join(assetsDir, "fonts"), { recursive: true });
  await fs.writeFile(path.join(assetsDir, "asset-manifest.json"), `${JSON.stringify(manifest)}\n`, "utf8");
}

async function writeOgImage() {
  const image = sharp(sourceFiles.og).resize(1200, 630, { fit: "cover" });

  await image.clone()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assetsDir, "og-default.png"));

  await image.clone()
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(publicDir, DEFAULT_OG_IMAGE.replace(/^\/+/, "")));
}

export async function generateAssets() {
  await ensureDir(publicDir);
  await ensureDir(assetsDir);
  await ensureDir(process.env.FONTCONFIG_CACHE);
  await copyBaseFiles();

  await writeCrop("error", cropConfig.error.crops.notFound, "mascot-404.png", 520);
  await writeCrop("daily", cropConfig.daily.crops.reading, "mascot-reading.png", 420);
  await writeCrop("daily", cropConfig.daily.crops.writing, "mascot-writing.png", 420);
  await writeCrop("daily", cropConfig.daily.crops.laptop, "mascot-laptop.png", 420);
  await writeCrop("emotions", cropConfig.emotions.crops.happy, "mascot-happy.png", 300);
  await writeCrop("emotions", cropConfig.emotions.crops.thinking, "mascot-thinking.png", 300);
  await writeCrop("emotions", cropConfig.emotions.crops.sleeping, "mascot-sleeping.png", 300);

  await writeFavicon();
  await writeManifest();
  await writeOgImage();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAssets().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
