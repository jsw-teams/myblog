import { generateAssets } from "./assets.mjs";
import { loadPosts } from "./lib/content.mjs";
import { localizeMarkdownImages } from "../scripts/localize-markdown-images.mjs";

process.env.OG_FETCH_REMOTE_COVERS = "false";

await localizeMarkdownImages();
await generateAssets();

const posts = await loadPosts();
const generatedOgImages = posts.filter((post) => post.ogImage?.startsWith("/assets/og/")).length;

console.log(`Prepared ${generatedOgImages} generated post OG image${generatedOgImages === 1 ? "" : "s"}.`);
console.log("All embedded Markdown images are localized under the project static asset tree before rendering.");
