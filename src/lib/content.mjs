import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import fg from "fast-glob";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { DEFAULT_LOCALE, LOCALES, formatDate, localeLabel, t } from "../i18n.mjs";
import {
  absoluteUrl,
  escapeHtml,
  basePath,
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
} from "../templates.mjs";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const staticDir = path.join(rootDir, "static");
const staticAssetsDir = path.join(staticDir, "assets");
const moreMarker = /<!--\s*more\s*-->/i;
const today = "2026-04-27";

export { DEFAULT_LOCALE, LOCALES, absoluteUrl };

export async function readSiteConfig() {
  return JSON.parse(await fs.readFile(path.join(contentDir, "site.config.json"), "utf8"));
}

function normalizeDate(value, fallback = today) {
  if (!value) return fallback;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
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
  const outputDir = path.join(staticAssetsDir, "content", normalizedKey);
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

export function stripMarkdown(markdown) {
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

export function termSlug(value) {
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

export async function loadPosts() {
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
    const media = parsed.data.media && typeof parsed.data.media === "object" ? parsed.data.media : null;
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
      media,
      ogImage: cover || "/assets/og-default.png",
      markdownBody: parsed.content.replace(moreMarker, "").trim(),
      html: renderMarkdown(parsed.content, baseDir, contentKey),
      url: `/${locale}/posts/${slug}/`,
      markdownUrl: `/md/${locale}/posts/${slug}.md`
    });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  decoratePosts(posts);
  return posts;
}

export async function loadPages() {
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

export function groupByLocale(posts, locale) {
  return posts.filter((post) => post.locale === locale);
}

export function buildTermMap(posts, locale, kind) {
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

export async function loadBlogData() {
  const site = await readSiteConfig();
  const posts = await loadPosts();
  const pages = await loadPages();
  return { site, posts, pages };
}

export async function buildHtmlPages() {
  const { site, posts, pages } = await loadBlogData();
  const routes = [];
  const add = (url, html) => routes.push({ url, html: applyBasePath(html) });

  add("/", renderRootPage({ site }));

  for (const locale of LOCALES) {
    const localePosts = groupByLocale(posts, locale);
    const categoryMap = buildTermMap(posts, locale, "categories");
    const tagMap = buildTermMap(posts, locale, "tags");

    add(`/${locale}/`, renderHomePage({ site, locale, posts: localePosts.slice(0, 8) }));
    add(`/${locale}/archive/`, renderArchivePage({ site, locale, groups: archiveGroups(posts, locale) }));
    add(`/${locale}/categories/`, renderTermIndexPage({
      site,
      locale,
      titleKey: "allCategories",
      descriptionKey: "categoriesDescription",
      terms: termList(categoryMap),
      url: `/${locale}/categories/`,
      current: "categories"
    }));
    add(`/${locale}/tags/`, renderTermIndexPage({
      site,
      locale,
      titleKey: "allTags",
      descriptionKey: "tagsDescription",
      terms: termList(tagMap),
      url: `/${locale}/tags/`,
      current: "tags"
    }));
    add(`/${locale}/search/`, renderSearchPage({ site, locale }));

    for (const term of categoryMap.values()) {
      const title = `${t(locale, "postsInCategory")}: ${term.name}`;
      const description = locale === "zh-CN"
        ? `查看「${term.name}」分类下的文章。`
        : locale === "zh-TW"
          ? `查看「${term.name}」分類下的文章。`
          : `Posts filed under ${term.name}.`;
      add(term.url, renderTermPage({ site, locale, title, description, posts: term.posts, url: term.url, current: "categories", parentKey: "categories" }));
    }

    for (const term of tagMap.values()) {
      const title = `${t(locale, "postsWithTag")}: ${term.name}`;
      const description = locale === "zh-CN"
        ? `查看带有「${term.name}」标签的文章。`
        : locale === "zh-TW"
          ? `查看帶有「${term.name}」標籤的文章。`
          : `Posts tagged ${term.name}.`;
      add(term.url, renderTermPage({ site, locale, title, description, posts: term.posts, url: term.url, current: "tags", parentKey: "tags" }));
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
      add(post.url, renderPostPage({ site, locale: post.locale, post, translations, previousPost, nextPost }));
    }
  }

  const pagesByTranslation = groupBy(pages, (page) => page.translationKey);
  for (const group of pagesByTranslation.values()) {
    const translations = translationsFor(group);
    for (const page of group) {
      if (page.slug === "about") {
        add(page.url, renderAboutPage({ site, locale: page.locale, page, translations }));
      }
    }
  }

  add("/sitemap/", renderVisualSitemap({ site, routes }));
  return routes;
}

export async function buildNotFoundHtml() {
  const site = await readSiteConfig();
  return applyBasePath(renderNotFoundPage({ site }));
}

function applyBasePath(html) {
  if (!basePath) return html;
  return html.replace(
    /\b(href|src|poster|data-video-src|content)=("?)\/(?!\/|myblog\/)([^"#?][^"]*)/g,
    (_match, attr, quote, pathValue) => `${attr}=${quote}${basePath}/${pathValue}`
  );
}

function renderVisualSitemap({ site, routes }) {
  const htmlRoutes = routes.filter((route) => route.url !== "/404.html");
  const rows = htmlRoutes
    .map((route) => {
      const url = absoluteUrl(site, route.url);
      return `<tr><td><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></td><td><time datetime="${today}">${today}</time></td><td></td></tr>`;
    })
    .join("");
  const main = `<main id="main" class="page-main list-main">
    <header class="page-heading">
      <h1>Sitemap</h1>
      <p class="lead">${htmlRoutes.length} URLs published for crawlers. The XML version is available at <a href="/sitemap.xml">/sitemap.xml</a>.</p>
    </header>
    <div class="table-wrap">
      <table>
        <thead><tr><th>URL</th><th>Last modified</th><th>Alternate languages</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </main>`;
  return renderLayout({
    site,
    locale: DEFAULT_LOCALE,
    title: "Sitemap",
    description: "Human-readable sitemap for blog.js.gripe.",
    url: "/sitemap/",
    main
  });
}

export function buildSearchIndex(posts, locale) {
  return groupByLocale(posts, locale).map((post) => ({
    title: post.title,
    description: post.description,
    url: post.url,
    date: post.date,
    updated: post.updated,
    category: post.category,
    tags: post.tags,
    text: stripMarkdown(post.markdownBody)
  }));
}

export function buildMarkdownMirror(site, post) {
  const markdown = rewriteMarkdownImages(post.markdownBody, post.baseDir, `posts/${post.slug}/${post.locale}`);
  return `# ${post.title}

${post.description}

- ${t(post.locale, "published")}: ${formatDate(post.date, post.locale)}
- ${t(post.locale, "updated")}: ${formatDate(post.updated, post.locale)}
- URL: ${absoluteUrl(site, post.url)}

${markdown}
`;
}

export function buildRobotsTxt(site) {
  return `# Claude is not welcome here because this site owner does not welcome
# unethical AI crawlers that freely scrape sites while arbitrarily
# banning user accounts.
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-User
Disallow: /

User-agent: *
Allow: /

Sitemap: ${absoluteUrl(site, "/sitemap.xml")}
`;
}

export function buildLlmsTxt(site, posts) {
  const latest = posts.slice(0, 20);
  const languageLines = LOCALES
    .map((locale) => `- ${localeLabel(locale)}: ${absoluteUrl(site, `/${locale}/`)}`)
    .join("\n");
  const articleLines = latest
    .map((post) => `- ${post.title}: ${absoluteUrl(site, post.markdownUrl)}`)
    .join("\n");
  return `# 技诉 Blog / blog.js.gripe

Public writing site for technical practice, web services, writing, and observation.

## Languages

${languageLines}

## Latest Markdown Mirrors

${articleLines}
`;
}

export function buildLlmsFullTxt(site, posts) {
  return `# 技诉 Blog / blog.js.gripe

${posts.map((post) => `## ${post.title}

Summary: ${post.description}

URL: ${absoluteUrl(site, post.url)}

Markdown: ${absoluteUrl(site, post.markdownUrl)}

${rewriteMarkdownImages(post.markdownBody, post.baseDir, `posts/${post.slug}/${post.locale}`)}
`).join("\n")}
`;
}
