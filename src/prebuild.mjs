import { generateAssets } from "./assets.mjs";
import { loadPosts } from "./lib/content.mjs";

process.env.OG_FETCH_REMOTE_COVERS = "true";

await generateAssets();

const posts = await loadPosts();
const generatedOgImages = posts.filter((post) => post.ogImage?.startsWith("/assets/og/")).length;

console.log(`Prepared ${generatedOgImages} generated post OG image${generatedOgImages === 1 ? "" : "s"}.`);
