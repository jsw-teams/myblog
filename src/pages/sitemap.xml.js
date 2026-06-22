import { buildSitemapXml } from "../lib/content.mjs";

export async function GET() {
  return new Response(await buildSitemapXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
