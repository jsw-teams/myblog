import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateAssets } from "./assets.mjs";
import { loadPosts } from "./lib/content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const blogMediaSource = path.join(rootDir, "content", "assets", "blog-media");
const blogMediaPublic = path.join(rootDir, "static", "assets", "blog-media");

process.env.OG_FETCH_REMOTE_COVERS = "true";

await generateAssets();

await fs.mkdir(blogMediaPublic, { recursive: true });
await fs.cp(blogMediaSource, blogMediaPublic, {
  recursive: true,
  force: true
});

const posts = await loadPosts();
const generatedOgImages = posts.filter((post) => post.ogImage?.startsWith("/assets/og/")).length;

console.log(`Prepared ${generatedOgImages} generated post OG image${generatedOgImages === 1 ? "" : "s"}.`);
console.log("Synced content/assets/blog-media to /assets/blog-media.");
