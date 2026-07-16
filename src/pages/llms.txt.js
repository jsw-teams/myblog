import { buildLlmsTxt, loadBlogData } from "../lib/content.mjs";

export async function GET() {
  const { site, posts } = await loadBlogData();
  return new Response(buildLlmsTxt(site, posts), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" }
  });
}
