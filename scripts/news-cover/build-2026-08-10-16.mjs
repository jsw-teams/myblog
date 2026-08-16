import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const outputPath = path.join(
  rootDir,
  "static/assets/blog-media/global-news-2026-08-10-16-cover.jpg"
);

const sources = [
  {
    key: "taiwan",
    url: "https://www.president.gov.tw/img/Image/8ad6f652-23d0-408d-8c3a-e27f85ec8c4b.jpg",
    sourcePage: "https://www.president.gov.tw/News/40217",
    credit: "中華民國總統府（2026-08-13 城鎮韌性演習相關現場照片）",
    license: "政府資料開放授權條款第1版"
  },
  {
    key: "singapore",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Marina_Bay_Skyline.png",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Marina_Bay_Skyline.png",
    credit: "Eentelijent / Wikimedia Commons",
    license: "CC BY-SA 4.0"
  },
  {
    key: "hormuz",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/cb/U_S_Forces_Start_Mine_Clearance_Mission_in_Strait_of_Hormuz_%289609002%29.jpg",
    sourcePage: "https://commons.wikimedia.org/wiki/File:U_S_Forces_Start_Mine_Clearance_Mission_in_Strait_of_Hormuz_(9609002).jpg",
    credit: "U.S. Central Command / U.S. Navy",
    license: "Public Domain"
  }
];

async function download(source, dir) {
  const response = await fetch(source.url, {
    redirect: "follow",
    headers: {
      "user-agent": "jsw-teams/myblog weekly-news-cover/1.0 (+https://blog.js.gripe)"
    },
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) {
    throw new Error(`${source.key}: HTTP ${response.status} from ${source.url}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`${source.key}: expected image/* but received ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 20_000) {
    throw new Error(`${source.key}: downloaded file is suspiciously small (${buffer.length} bytes)`);
  }

  const ext = contentType.includes("png") ? ".png" : ".jpg";
  const target = path.join(dir, `${source.key}${ext}`);
  await fs.writeFile(target, buffer);

  const meta = await sharp(target).metadata();
  if (!meta.width || !meta.height || !meta.format) {
    throw new Error(`${source.key}: Sharp could not decode downloaded source`);
  }
  console.log(`${source.key}: ${meta.format} ${meta.width}x${meta.height}, ${buffer.length} bytes`);
  return target;
}

async function panel(input, width, height, position = "attention") {
  return sharp(input)
    .rotate()
    .resize(width, height, { fit: "cover", position })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "weekly-news-cover-"));
try {
  const downloaded = Object.fromEntries(
    await Promise.all(
      sources.map(async (source) => [source.key, await download(source, tempDir)])
    )
  );

  const taiwan = await panel(downloaded.taiwan, 716, 600, "attention");
  const singapore = await panel(downloaded.singapore, 778, 296, "centre");
  const hormuz = await panel(downloaded.hormuz, 778, 298, "attention");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp({
    create: {
      width: 1500,
      height: 600,
      channels: 3,
      background: { r: 246, g: 246, b: 242 }
    }
  })
    .composite([
      { input: taiwan, left: 0, top: 0 },
      { input: singapore, left: 722, top: 0 },
      { input: hormuz, left: 722, top: 302 }
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(outputPath);

  const outputMeta = await sharp(outputPath).metadata();
  if (
    outputMeta.format !== "jpeg" ||
    outputMeta.width !== 1500 ||
    outputMeta.height !== 600
  ) {
    throw new Error(`Final cover validation failed: ${JSON.stringify(outputMeta)}`);
  }

  const stats = await sharp(outputPath).stats();
  if (!stats.channels?.length) {
    throw new Error("Final cover pixel validation failed");
  }

  console.log(`Final cover: ${path.relative(rootDir, outputPath)} (${outputMeta.width}x${outputMeta.height})`);
  console.log("Sources:");
  for (const source of sources) {
    console.log(`- ${source.credit} | ${source.license} | ${source.sourcePage}`);
  }
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
