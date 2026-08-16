import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateAssets } from "./assets.mjs";
import { loadPosts } from "./lib/content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const newsMediaSourceDir = path.join(rootDir, "content", "assets", "blog-media");
const publicNewsMediaDir = path.join(rootDir, "static", "assets", "blog-media");

process.env.OG_FETCH_REMOTE_COVERS = "true";

async function buildWeeklyNewsCover() {
  const { default: sharp } = await import("sharp");
  const output = path.join(publicNewsMediaDir, "global-news-2026-08-10-16-cover.jpg");
  await fs.mkdir(publicNewsMediaDir, { recursive: true });

  const panel = async (name, width, height, position = "attention") => sharp(path.join(newsMediaSourceDir, name))
    .resize(width, height, { fit: "cover", position })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const taiwan = await panel("news-2026-07-20-31-taiwan-cna.jpg", 744, 600);
  const asean = await panel("news-2026-07-20-31-asean-ap.jpg", 750, 296);
  const wildfire = await panel("news-2026-07-20-31-wildfire-ap.jpg", 372, 298);
  const ebola = await panel("news-2026-07-20-31-ebola-ap.jpg", 372, 298);

  await sharp({
    create: {
      width: 1500,
      height: 600,
      channels: 3,
      background: { r: 242, g: 239, b: 232 }
    }
  })
    .composite([
      { input: taiwan, left: 0, top: 0 },
      { input: asean, left: 750, top: 0 },
      { input: wildfire, left: 750, top: 302 },
      { input: ebola, left: 1128, top: 302 }
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(output);

  const metadata = await sharp(output).metadata();
  if (metadata.format !== "jpeg" || metadata.width !== 1500 || metadata.height !== 600) {
    throw new Error(`Invalid weekly-news cover output: ${JSON.stringify(metadata)}`);
  }

  console.log(`Prepared weekly-news cover: ${path.relative(rootDir, output)} (${metadata.width}x${metadata.height}).`);
}

await generateAssets();
await buildWeeklyNewsCover();

const posts = await loadPosts();
const generatedOgImages = posts.filter((post) => post.ogImage?.startsWith("/assets/og/")).length;

console.log(`Prepared ${generatedOgImages} generated post OG image${generatedOgImages === 1 ? "" : "s"}.`);
console.log("Using static/assets/blog-media as the canonical local media library.");
