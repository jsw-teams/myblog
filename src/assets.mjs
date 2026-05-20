import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "static");
const assetsDir = path.join(publicDir, "assets");
const sourceDir = path.join(rootDir, "source-assets");
const cacheDir = path.join(rootDir, ".cache");

process.env.XDG_CACHE_HOME ??= cacheDir;
process.env.FONTCONFIG_CACHE ??= path.join(cacheDir, "fontconfig");

const { default: sharp } = await import("sharp");

const sourceFiles = {
  daily: path.join(sourceDir, "mascot-daily-actions.png"),
  emotions: path.join(sourceDir, "mascot-emotions.png"),
  error: path.join(sourceDir, "mascot-error-actions.png")
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
  const crop = cropConfig.daily.crops.laptop;
  await (await transparentCrop("daily", crop))
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
    name: "技诉 Blog",
    short_name: "技诉",
    start_url: "/",
    display: "minimal-ui",
    background_color: "#f8f4ec",
    theme_color: "#141414",
    icons: [
      {
        src: "/assets/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/assets/icon-512.png",
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
  await fs.copyFile(path.join(rootDir, "src", "styles.css"), path.join(assetsDir, "site.css"));
  await fs.copyFile(path.join(rootDir, "src", "client.js"), path.join(assetsDir, "client.js"));
  await fs.copyFile(path.join(rootDir, "src", "privacy-plugin-loader.js"), path.join(assetsDir, "privacy-plugin-loader.js"));
  await fs.copyFile(path.join(rootDir, "src", "privacy-plugins.json"), path.join(assetsDir, "privacy-plugins.json"));
}

async function writeOgImage() {
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

  await sharp({
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
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assetsDir, "og-default.png"));
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
