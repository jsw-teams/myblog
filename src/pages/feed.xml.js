import rss from "@astrojs/rss";
import { absoluteUrl, loadBlogData, DEFAULT_LOCALE } from "../lib/content.mjs";

export async function GET(context) {
  const { site, posts } = await loadBlogData();
  return rss({
    title: "技诉 Blog / Blog.openjsu.com",
    description: site.description[DEFAULT_LOCALE],
    site: context.site ?? site.siteUrl,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      link: post.url,
      pubDate: new Date(`${post.date}T00:00:00Z`),
      customData: `<content:encoded><![CDATA[${post.html}]]></content:encoded><guid>${absoluteUrl(site, post.url)}</guid>`
    })),
    xmlns: { content: "http://purl.org/rss/1.0/modules/content/" }
  });
}
