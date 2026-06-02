import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { minify } from "html-minifier-terser";
import { Feed } from "feed";
import { generateAssets } from "./assets.mjs";
import { DEFAULT_LOCALE, LOCALES, formatDate, localeLabel, t } from "./i18n.mjs";
import {
  absoluteUrl,
  baseJsonLd,
  breadcrumbJsonLd,
  escapeHtml,
  renderAboutPage,
  renderArchivePage,
  renderHomePage,
  renderLayout,
  renderNotFoundPage,
  renderPostPage,
  renderRootPage,
  renderSearchPage,
  renderTermIndexPage,
  renderTermPage
} from "./templates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const contentDir = path.join(rootDir, "content");
const publicDir = path.join(rootDir, "public");
const publicAssetsDir = path.join(publicDir, "assets");
const moreMarker = /<!--\s*more\s*-->/i;
const today = "2026-04-27";

const generatedPages = [];

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function cleanPublic() {
  const resolved = path.resolve(publicDir);
  if (!resolved.startsWith(rootDir)) {
    throw new Error(`Refusing to clean outside project: ${resolved}`);
  }
  await fs.rm(resolved, { recursive: true, force: true });
  await ensureDir(resolved);
}

async function copyBaseFiles() {
  await ensureDir(publicAssetsDir);
  await fs.copyFile(path.join(__dirname, "styles.css"), path.join(publicAssetsDir, "site.css"));
  await fs.copyFile(path.join(__dirname, "client.js"), path.join(publicAssetsDir, "client.js"));
  await fs.copyFile(path.join(__dirname, "privacy-plugin-loader.js"), path.join(publicAssetsDir, "privacy-plugin-loader.js"));
  await fs.copyFile(path.join(__dirname, "privacy-plugins.json"), path.join(publicAssetsDir, "privacy-plugins.json"));
  await fs.copyFile(path.join(__dirname, "privacy-plugin-banner.css"), path.join(publicAssetsDir, "privacy-plugin-banner.css"));
}

function normalizeDate(value, fallback = today) {
  if (!value) return fallback;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function routeToFile(urlPath) {
  if (urlPath === "/") return path.join(publicDir, "index.html");
  if (urlPath.endsWith(".html")) return path.join(publicDir, urlPath);
  return path.join(publicDir, urlPath, "index.html");
}

async function writeFileEnsured(file, contents) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, contents, "utf8");
}

async function writeHtml(urlPath, html, options = {}) {
  const output = routeToFile(urlPath);
  const minified = await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
    sortAttributes: true,
    sortClassName: true
  });
  await writeFileEnsured(output, `${minified}\n`);
  if (options.sitemap !== false) {
    generatedPages.push({
      url: urlPath,
      updated: options.updated ?? today,
      alternates: options.alternates ?? []
    });
  }
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(value);
}

function safeName(name) {
  const parsed = path.parse(name);
  const base = parsed.name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "asset";
  return `${base}${parsed.ext.toLowerCase()}`;
}

function copyContentAsset(src, baseDir, contentKey) {
  if (!src || isExternalUrl(src)) return src;
  const match = /^([^?#]+)([?#].*)?$/.exec(src);
  if (!match) return src;
  const assetPath = decodeURIComponent(match[1]);
  const suffix = match[2] ?? "";
  const sourcePath = path.resolve(baseDir, assetPath);
  const relativeToContent = path.relative(contentDir, sourcePath);
  if (relativeToContent.startsWith("..") || path.isAbsolute(relativeToContent)) return src;
  if (!fsSync.existsSync(sourcePath)) return src;

  const hash = crypto.createHash("sha1").update(`${relativeToContent}:${fsSync.statSync(sourcePath).mtimeMs}`).digest("hex").slice(0, 10);
  const filename = `${hash}-${safeName(path.basename(assetPath))}`;
  const normalizedKey = contentKey.split(/[\\/]+/).map((part) => encodeURIComponent(part)).join("/");
  const outputDir = path.join(publicAssetsDir, "content", normalizedKey);
  fsSync.mkdirSync(outputDir, { recursive: true });
  fsSync.copyFileSync(sourcePath, path.join(outputDir, filename));
  return `/assets/content/${normalizedKey}/${filename}${suffix}`;
}

function headingSlug(value) {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 8);
}

function createMarkdownRenderer(baseDir, contentKey) {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true
  }).use(anchor, {
    slugify: headingSlug
  });
  const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const href = token.attrGet("href");
    if (/^(?:https?:)?\/\//i.test(href ?? "")) {
      token.attrJoin("rel", "nofollow");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };
  const defaultImage = md.renderer.rules.image ?? ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src");
    if (src) token.attrSet("src", copyContentAsset(src, baseDir, contentKey));
    token.attrSet("loading", "lazy");
    token.attrSet("decoding", "async");
    return defaultImage(tokens, idx, options, env, self);
  };
  return md;
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainSummary(content, description) {
  if (description) return String(description).trim();
  const split = content.split(moreMarker);
  const source = split.length > 1 ? split[0] : content;
  const text = stripMarkdown(source);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function renderMarkdown(content, baseDir, contentKey) {
  const body = content.replace(moreMarker, "").trim();
  const html = createMarkdownRenderer(baseDir, contentKey).render(body);
  return html
    .replaceAll("<table>", '<div class="table-wrap"><table>')
    .replaceAll("</table>", "</table></div>");
}

function rewriteMarkdownImages(content, baseDir, contentKey) {
  return content.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (match, alt, src) => {
    const copied = copyContentAsset(src, baseDir, contentKey);
    return `![${alt}](${copied})`;
  });
}

function termSlug(value) {
  const text = String(value).trim();
  const normalized = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (/^[a-z0-9][a-z0-9-]*$/i.test(normalized)) return normalized.toLowerCase();
  return `term-${crypto.createHash("sha1").update(text).digest("hex").slice(0, 10)}`;
}

function localeFromPostFilename(file) {
  const match = path.basename(file).match(/^index\.(.+)\.md$/);
  return match?.[1] ?? "";
}

async function loadPosts() {
  const files = await fg("content/posts/*/index.*.md", { cwd: rootDir, onlyFiles: true });
  const posts = [];
  for (const file of files) {
    const locale = localeFromPostFilename(file);
    if (!LOCALES.includes(locale)) continue;
    const sourcePath = path.join(rootDir, file);
    const raw = await fs.readFile(sourcePath, "utf8");
    const parsed = matter(raw);
    if (parsed.data.draft === true) continue;
    const parts = file.split(/[\\/]/);
    const slug = parts[2];
    const baseDir = path.dirname(sourcePath);
    const contentKey = `posts/${slug}/${locale}`;
    const date = normalizeDate(parsed.data.date);
    const updated = normalizeDate(parsed.data.updated, date);
    const description = plainSummary(parsed.content, parsed.data.description);
    const cover = parsed.data.cover ? copyContentAsset(String(parsed.data.cover), baseDir, contentKey) : "";
    posts.push({
      slug,
      locale,
      sourcePath,
      baseDir,
      translationKey: parsed.data.translationKey || slug,
      title: parsed.data.title || slug,
      description,
      date,
      updated,
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
      category: parsed.data.category ? String(parsed.data.category) : "Notes",
      cover,
      ogImage: cover || "/assets/og-default.png",
      markdownBody: parsed.content.replace(moreMarker, "").trim(),
      html: renderMarkdown(parsed.content, baseDir, contentKey),
      url: `/${locale}/posts/${slug}/`,
      markdownUrl: `/markdown/${locale}/posts/${slug}.md`
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

async function loadPages() {
  const files = await fg("content/pages/*.md", { cwd: rootDir, onlyFiles: true });
  const pages = [];
  for (const file of files) {
    const match = path.basename(file).match(/^(.+)\.(.+)\.md$/);
    if (!match) continue;
    const [, slug, locale] = match;
    if (!LOCALES.includes(locale)) continue;
    const sourcePath = path.join(rootDir, file);
    const raw = await fs.readFile(sourcePath, "utf8");
    const parsed = matter(raw);
    const baseDir = path.dirname(sourcePath);
    const contentKey = `pages/${slug}/${locale}`;
    pages.push({
      slug,
      locale,
      translationKey: parsed.data.translationKey || slug,
      title: parsed.data.title || slug,
      description: plainSummary(parsed.content, parsed.data.description),
      updated: normalizeDate(parsed.data.updated),
      html: renderMarkdown(parsed.content, baseDir, contentKey),
      url: `/${locale}/${slug}/`
    });
  }
  return pages;
}

function decoratePosts(posts) {
  for (const post of posts) {
    post.categoryUrl = `/${post.locale}/categories/${termSlug(post.category)}/`;
    post.tagUrls = Object.fromEntries(post.tags.map((tag) => [tag, `/${post.locale}/tags/${termSlug(tag)}/`]));
  }
}

function groupByLocale(posts, locale) {
  return posts.filter((post) => post.locale === locale);
}

function buildTermMap(posts, locale, kind) {
  const map = new Map();
  for (const post of groupByLocale(posts, locale)) {
    const values = kind === "categories" ? [post.category] : post.tags;
    for (const value of values) {
      const key = String(value);
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          slug: termSlug(key),
          url: `/${locale}/${kind}/${termSlug(key)}/`,
          posts: []
        });
      }
      map.get(key).posts.push(post);
    }
  }
  return map;
}

function termList(map) {
  return [...map.values()]
    .map((entry) => ({ name: entry.name, url: entry.url, count: entry.posts.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function archiveGroups(posts, locale) {
  const byYear = new Map();
  for (const post of groupByLocale(posts, locale)) {
    const year = post.date.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(post);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, yearPosts]) => ({ year, posts: yearPosts }));
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function translationsFor(group, localePath = (item) => item.url) {
  return LOCALES
    .map((locale) => group.find((item) => item.locale === locale))
    .filter(Boolean)
    .map((item) => ({ locale: item.locale, url: localePath(item), title: item.title }));
}

async function writeMarkdownMirror(post) {
  const markdown = rewriteMarkdownImages(post.markdownBody, post.baseDir, `posts/${post.slug}/${post.locale}`);
  const body = `# ${post.title}

${post.description}

- ${t(post.locale, "published")}: ${formatDate(post.date, post.locale)}
- ${t(post.locale, "updated")}: ${formatDate(post.updated, post.locale)}
- URL: ${absoluteUrl(await siteConfig(), post.url)}

${markdown}
`;
  await writeFileEnsured(path.join(publicDir, post.markdownUrl), body);
}

let cachedConfig;
async function siteConfig() {
  if (!cachedConfig) cachedConfig = await readJson(path.join(contentDir, "site.config.json"));
  return cachedConfig;
}

async function writeFeeds(site, posts) {
  const makeFeed = (locale, feedPosts, urlPath, title) => {
    const feed = new Feed({
      title,
      description: locale === "all" ? site.description[DEFAULT_LOCALE] : site.description[locale],
      id: absoluteUrl(site, urlPath),
      link: absoluteUrl(site, locale === "all" ? "/" : `/${locale}/`),
      language: locale === "all" ? DEFAULT_LOCALE : locale,
      favicon: absoluteUrl(site, "/favicon.ico"),
      copyright: `${new Date().getUTCFullYear()} ${title}`
    });
    for (const post of feedPosts) {
      feed.addItem({
        title: post.title,
        id: absoluteUrl(site, post.url),
        link: absoluteUrl(site, post.url),
        description: post.description,
        content: post.html,
        date: new Date(`${post.date}T00:00:00Z`)
      });
    }
    return feed.rss2();
  };

  await writeFileEnsured(path.join(publicDir, "feed.xml"), makeFeed("all", posts, "/feed.xml", "技诉 Blog / Blog.js.gripe"));
  for (const locale of LOCALES) {
    await writeFileEnsured(
      path.join(publicDir, locale, "feed.xml"),
      makeFeed(locale, groupByLocale(posts, locale), `/${locale}/feed.xml`, site.siteName[locale])
    );
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function writeSitemap(site) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${generatedPages.map((page) => `  <url>
    <loc>${escapeXml(absoluteUrl(site, page.url))}</loc>
    <lastmod>${escapeXml(page.updated)}</lastmod>
${(page.alternates ?? []).map((alt) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(absoluteUrl(site, alt.url))}" />`).join("\n")}
  </url>`).join("\n")}
</urlset>
`;
  await writeFileEnsured(path.join(publicDir, "sitemap.xml"), xml);
}

async function writeSearchIndexes(posts) {
  for (const locale of LOCALES) {
    const entries = groupByLocale(posts, locale).map((post) => ({
      title: post.title,
      description: post.description,
      url: post.url,
      date: post.date,
      updated: post.updated,
      category: post.category,
      tags: post.tags,
      text: stripMarkdown(post.markdownBody)
    }));
    await writeFileEnsured(path.join(publicAssetsDir, `search-index.${locale}.json`), JSON.stringify(entries));
  }
}

async function writeVisualSitemap(site) {
  const rows = generatedPages
    .map((page) => {
      const alternates = (page.alternates ?? [])
        .map((alt) => escapeHtml(alt.hreflang))
        .join(", ");
      return `<tr>
        <td><a href="${escapeHtml(absoluteUrl(site, page.url))}">${escapeHtml(absoluteUrl(site, page.url))}</a></td>
        <td><time datetime="${escapeHtml(page.updated)}">${escapeHtml(page.updated)}</time></td>
        <td>${alternates}</td>
      </tr>`;
    })
    .join("");
  const main = `<main id="main" class="page-main list-main">
    <header class="page-heading">
      <h1>Sitemap</h1>
      <p class="lead">${generatedPages.length} URLs published for crawlers. The XML version is available at <a href="/sitemap.xml">/sitemap.xml</a>.</p>
    </header>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Last modified</th>
            <th>Alternate languages</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </main>`;
  await writeHtml("/sitemap/", renderLayout({
    site,
    locale: DEFAULT_LOCALE,
    title: "Sitemap",
    description: "Human-readable sitemap for blog.js.gripe.",
    url: "/sitemap/",
    main
  }), { sitemap: false });
}

async function writeRobots(site) {
  const body = `# Claude is not welcome here because this site owner does not welcome
# unethical AI crawlers that freely scrape sites while arbitrarily
# banning user accounts.
User-agent: ClaudeBot
Disallow: /

User-agent: Claude-User
Disallow: /

User-agent: *
Allow: /

Sitemap: ${absoluteUrl(site, "/sitemap.xml")}
`;
  await writeFileEnsured(path.join(publicDir, "robots.txt"), body);
}

function hasHeaderBlock(headers, pathPattern, headerPattern) {
  const blockPattern = new RegExp(`(?:^|\\n)${pathPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n(?<body>(?:\\s+[^\\n]+\\n?)+)`, "m");
  const body = headers.match(blockPattern)?.groups?.body ?? "";
  return headerPattern.test(body);
}

async function writeAgentFiles(site, posts) {
  const latest = posts.slice(0, 20);
  const languageLines = LOCALES
    .map((locale) => `- ${localeLabel(locale)}: ${absoluteUrl(site, `/${locale}/`)}`)
    .join("\n");
  const articleLines = latest
    .map((post) => `- ${post.title}: ${absoluteUrl(site, post.markdownUrl)}`)
    .join("\n");
  const llms = `# 技诉 Blog / blog.js.gripe

Public writing site for technical practice, web services, writing, and observation.

## Languages

${languageLines}

## Latest Markdown Mirrors

${articleLines}
`;
  await writeFileEnsured(path.join(publicDir, "llms.txt"), llms);

  const full = `# 技诉 Blog / blog.js.gripe

${posts.map((post) => `## ${post.title}

Summary: ${post.description}

URL: ${absoluteUrl(site, post.url)}

Markdown: ${absoluteUrl(site, post.markdownUrl)}

${rewriteMarkdownImages(post.markdownBody, post.baseDir, `posts/${post.slug}/${post.locale}`)}
`).join("\n")}
`;
  await writeFileEnsured(path.join(publicDir, "llms-full.txt"), full);
}

async function writeCloudflareFiles() {
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Signal: ai-train=no, search=yes, ai-input=yes

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  X-Content-Type-Options: nosniff
  Content-Signal: ai-train=no, search=yes, ai-input=yes

/markdown/*
  Content-Type: text/markdown; charset=utf-8
  X-Content-Type-Options: nosniff
  Content-Signal: ai-train=no, search=yes, ai-input=yes

/llms.txt
  Content-Type: text/plain; charset=utf-8
  Content-Signal: ai-train=no, search=yes, ai-input=yes

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  Content-Signal: ai-train=no, search=yes, ai-input=yes
`;
  const redirects = `/zh /zh-CN/ 302
/cn /zh-CN/ 302
/zh-cn /zh-CN/ 302
/en-us /en/ 302
/english /en/ 302
`;
  await writeFileEnsured(path.join(publicDir, "_headers"), headers);
  await writeFileEnsured(path.join(publicDir, "_redirects"), redirects);
}

async function build() {
  generatedPages.length = 0;
  const site = await siteConfig();
  await cleanPublic();
  await generateAssets();
  await copyBaseFiles();

  const posts = await loadPosts();
  decoratePosts(posts);
  const pages = await loadPages();

  await writeHtml("/", renderRootPage({ site }), {
    updated: today,
    alternates: LOCALES.map((locale) => ({ hreflang: locale, url: `/${locale}/` })).concat({ hreflang: "x-default", url: "/" })
  });

  for (const locale of LOCALES) {
    const localePosts = groupByLocale(posts, locale);
    const categoryMap = buildTermMap(posts, locale, "categories");
    const tagMap = buildTermMap(posts, locale, "tags");
    await writeHtml(`/${locale}/`, renderHomePage({
      site,
      locale,
      posts: localePosts.slice(0, 8),
      categories: termList(categoryMap),
      tags: termList(tagMap),
      recentUpdated: [...localePosts].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6)
    }), {
      updated: localePosts[0]?.updated ?? today,
      alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/` })).concat({ hreflang: "x-default", url: "/" })
    });

    await writeHtml(`/${locale}/archive/`, renderArchivePage({ site, locale, groups: archiveGroups(posts, locale) }), {
      updated: localePosts[0]?.updated ?? today,
      alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/archive/` })).concat({ hreflang: "x-default", url: "/zh-CN/archive/" })
    });

    await writeHtml(`/${locale}/categories/`, renderTermIndexPage({
      site,
      locale,
      titleKey: "allCategories",
      descriptionKey: "categoriesDescription",
      terms: termList(categoryMap),
      url: `/${locale}/categories/`,
      current: "categories"
    }), {
      updated: localePosts[0]?.updated ?? today
    });

    await writeHtml(`/${locale}/tags/`, renderTermIndexPage({
      site,
      locale,
      titleKey: "allTags",
      descriptionKey: "tagsDescription",
      terms: termList(tagMap),
      url: `/${locale}/tags/`,
      current: "tags"
    }), {
      updated: localePosts[0]?.updated ?? today
    });

    await writeHtml(`/${locale}/search/`, renderSearchPage({ site, locale }), {
      updated: localePosts[0]?.updated ?? today,
      alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/search/` })).concat({ hreflang: "x-default", url: "/zh-CN/search/" })
    });

    for (const term of categoryMap.values()) {
      const title = `${t(locale, "postsInCategory")}: ${term.name}`;
      const description = locale === "zh-CN"
        ? `查看「${term.name}」分类下的文章。`
        : locale === "zh-TW"
          ? `查看「${term.name}」分類下的文章。`
          : `Posts filed under ${term.name}.`;
      await writeHtml(term.url, renderTermPage({
        site,
        locale,
        title,
        description,
        posts: term.posts,
        url: term.url,
        current: "categories",
        parentKey: "categories"
      }), { updated: term.posts[0]?.updated ?? today });
    }

    for (const term of tagMap.values()) {
      const title = `${t(locale, "postsWithTag")}: ${term.name}`;
      const description = locale === "zh-CN"
        ? `查看带有「${term.name}」标签的文章。`
        : locale === "zh-TW"
          ? `查看帶有「${term.name}」標籤的文章。`
          : `Posts tagged ${term.name}.`;
      await writeHtml(term.url, renderTermPage({
        site,
        locale,
        title,
        description,
        posts: term.posts,
        url: term.url,
        current: "tags",
        parentKey: "tags"
      }), { updated: term.posts[0]?.updated ?? today });
    }
  }

  const postsByTranslation = groupBy(posts, (post) => post.translationKey);
  for (const group of postsByTranslation.values()) {
    const translations = translationsFor(group);
    for (const post of group) {
      const localePosts = groupByLocale(posts, post.locale);
      const index = localePosts.findIndex((entry) => entry.url === post.url);
      const nextPost = index > 0 ? localePosts[index - 1] : null;
      const previousPost = index < localePosts.length - 1 ? localePosts[index + 1] : null;
      await writeHtml(post.url, renderPostPage({
        site,
        locale: post.locale,
        post,
        translations,
        previousPost,
        nextPost
      }), {
        updated: post.updated,
        alternates: translations.map((entry) => ({ hreflang: entry.locale, url: entry.url })).concat({
          hreflang: "x-default",
          url: translations.find((entry) => entry.locale === DEFAULT_LOCALE)?.url ?? translations[0].url
        })
      });
      await writeMarkdownMirror(post);
    }
  }

  const pagesByTranslation = groupBy(pages, (page) => page.translationKey);
  for (const group of pagesByTranslation.values()) {
    const translations = translationsFor(group);
    for (const page of group) {
      if (page.slug !== "about") continue;
      await writeHtml(page.url, renderAboutPage({ site, locale: page.locale, page, translations }), {
        updated: page.updated,
        alternates: translations.map((entry) => ({ hreflang: entry.locale, url: entry.url })).concat({
          hreflang: "x-default",
          url: translations.find((entry) => entry.locale === DEFAULT_LOCALE)?.url ?? translations[0].url
        })
      });
    }
  }

  await writeHtml("/404.html", renderNotFoundPage({ site }), { sitemap: false });
  await writeFeeds(site, posts);
  await writeSearchIndexes(posts);
  await writeSitemap(site);
  await writeVisualSitemap(site);
  await writeRobots(site);
  await writeAgentFiles(site, posts);
  await writeCloudflareFiles();
}

async function check() {
  const required = ["index.html", "404.html", "sitemap.xml", "robots.txt", "_headers", "llms.txt"];
  const missing = [];
  for (const file of required) {
    if (!fsSync.existsSync(path.join(publicDir, file))) missing.push(file);
  }
  if (missing.length) throw new Error(`Missing required public files: ${missing.join(", ")}`);

  const sitemap = await fs.readFile(path.join(publicDir, "sitemap.xml"), "utf8");
  if (!sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')) {
    throw new Error("sitemap.xml must start with an XML declaration");
  }
  if (sitemap.includes("<?xml-stylesheet")) {
    throw new Error("sitemap.xml must not rely on XSLT processing instructions");
  }
  if (!/<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(sitemap)) {
    throw new Error("sitemap.xml is missing the sitemap urlset namespace");
  }
  if (!/<url>\s*<loc>https:\/\/blog\.js\.gripe\//.test(sitemap)) {
    throw new Error("sitemap.xml does not contain absolute site URLs");
  }

  const headers = await fs.readFile(path.join(publicDir, "_headers"), "utf8");
  if (!hasHeaderBlock(headers, "/sitemap.xml", /^\s*Content-Type:\s*application\/xml;\s*charset=utf-8\s*$/im)) {
    throw new Error("_headers must serve /sitemap.xml as application/xml");
  }

  const redirects = await fs.readFile(path.join(publicDir, "_redirects"), "utf8");
  if (/\/\*\s+\/index\.html\s+200/.test(redirects)) {
    throw new Error("_redirects contains a SPA fallback");
  }

  const leakTerms = ["README", "部署说明", "技术栈", "Cloudflare Pages 构建"];
  const htmlFiles = await fg("**/*.html", { cwd: publicDir, onlyFiles: true });
  for (const file of htmlFiles) {
    const html = await fs.readFile(path.join(publicDir, file), "utf8");
    for (const term of leakTerms) {
      if (html.includes(term)) throw new Error(`${file} contains internal term: ${term}`);
    }
    if (!/<title>[^<]+<\/title>/i.test(html)) throw new Error(`${file} is missing title`);
    if (!/<meta[^>]+name=["']description["'][^>]*>/i.test(html)) throw new Error(`${file} is missing description`);
    if (!/<main\b/i.test(html)) throw new Error(`${file} is missing main`);
  }

  for (const locale of LOCALES) {
    const searchPage = path.join(publicDir, locale, "search", "index.html");
    const searchIndex = path.join(publicAssetsDir, `search-index.${locale}.json`);
    if (!fsSync.existsSync(searchPage)) throw new Error(`Missing search page for ${locale}`);
    if (!fsSync.existsSync(searchIndex)) throw new Error(`Missing search index for ${locale}`);
    const entries = JSON.parse(await fs.readFile(searchIndex, "utf8"));
    if (!Array.isArray(entries)) throw new Error(`Search index for ${locale} must be an array`);
  }
  console.log(`Checked ${htmlFiles.length} HTML files and required static outputs.`);
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon"
  }[ext] ?? "application/octet-stream";
}

async function serve() {
  const port = Number(process.env.PORT || 4173);
  const server = http.createServer(async (request, response) => {
    try {
      const parsed = new URL(request.url, `http://${request.headers.host}`);
      let pathname = decodeURIComponent(parsed.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const filePath = path.resolve(publicDir, pathname.replace(/^\/+/, ""));
      if (!filePath.startsWith(publicDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      let finalPath = filePath;
      let status = 200;
      if (!fsSync.existsSync(finalPath) || fsSync.statSync(finalPath).isDirectory()) {
        finalPath = path.join(publicDir, "404.html");
        status = 404;
      }
      response.writeHead(status, { "Content-Type": contentType(finalPath) });
      fsSync.createReadStream(finalPath).pipe(response);
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Bad request");
    }
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Serving public/ at http://127.0.0.1:${port}/`);
  });
}

const command = process.argv[2] ?? "build";

try {
  if (command === "clean") await cleanPublic();
  else if (command === "build") await build();
  else if (command === "check") await check();
  else if (command === "serve") await serve();
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
