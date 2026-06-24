import { buildSitemapXml } from "../lib/sitemap.mjs";

export async function GET() {
  return new Response(await buildSitemapXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache"
    }
  });
}
