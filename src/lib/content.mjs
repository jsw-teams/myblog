import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";
import fg from "fast-glob";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { DEFAULT_LOCALE, LOCALES, configureThemeI18n, formatDate, localeLabel, t } from "../i18n.mjs";
import {
  absoluteUrl,
  basePath,
  defaultTemplates
} from "../templates.mjs";
import { loadHtmlThemeTemplates } from "./theme-html.mjs";
import { DEFAULT_OG_IMAGE, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "../og-images.mjs";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const staticDir = path.join(rootDir, "static");
const staticAssetsDir = path.join(staticDir, "assets");
const moreMarker = /<!--\s*more\s*-->/i;
const today = "2026-04-27";

export { DEFAULT_LOCALE, LOCALES, absoluteUrl };

async function loadThemeTemplates(site) {
  const themeName = site.theme?.name || "default";
  const themeDir = path.join(rootDir, "themes", themeName);
  const templateTarget = site.theme?.templates || "templates";
  const templatePath = path.join(themeDir, templateTarget);
  if (!fsSync.existsSync(templatePath)) return defaultTemplates;
  if (fsSync.statSync(templatePath).isDirectory()) {
    const overrides = loadHtmlThemeTemplates(site, themeDir, templateTarget);
    return Object.fromEntries(Object.entries({ ...defaultTemplates, ...overrides }).map(([key, fn]) => [
      key,
      typeof fn === "function"
        ? (...args) => fn(...args) ?? defaultTemplates[key](...args)
        : fn
    ]));
  }
  const themeModule = await import(pathToFileURL(templatePath).href);
  const overrides = themeModule.templates || themeModule;
  return { ...defaultTemplates, ...overrides };
}

async function readConfigFile(file) {
  const raw = await fs.readFile(file, "utf8");
  if (file.endsWith(".json")) return JSON.parse(raw);
  return matter(`---\n${raw}\n---`).data;
}

function mergePlainDefaults(defaults, overrides) {
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) return overrides ?? defaults;
  const merged = { ...defaults };
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return merged;
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      merged[key] &&
      typeof merged[key] === "object" &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = mergePlainDefaults(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function themeAssetVersion(themeName, filename) {
  if (!filename || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(String(filename))) return "";
  const file = path.join(rootDir, "themes", themeName, String(filename));
  if (!fsSync.existsSync(file)) return "";
  return crypto.createHash("sha1").update(fsSync.readFileSync(file)).digest("hex").slice(0, 10);
}

function themeAssetUrl(themeName, filename) {
  const version = themeAssetVersion(themeName, filename);
  const clean = String(filename).replace(/^\/+/, "");
  return `/assets/theme/${themeName}/${clean}${version ? `?v=${version}` : ""}`;
}

async function readThemeConfig(config) {
  const themeRef = typeof config.theme === "string" ? { name: config.theme } : config.theme || {};
  const themeName = themeRef.name || "default";
  const themeFile = path.join(rootDir, "themes", themeName, "theme.yml");
  const themeDefaults = fsSync.existsSync(themeFile) ? await readConfigFile(themeFile) : {};
  if (typeof themeDefaults.i18n === "string") {
    const i18nFile = path.join(rootDir, "themes", themeName, themeDefaults.i18n);
    themeDefaults.i18n = fsSync.existsSync(i18nFile) ? await readConfigFile(i18nFile) : {};
  }
  const theme = mergePlainDefaults(themeDefaults, themeRef);
  theme.name = theme.name || themeName;
  return theme;
}

function normalizeSiteConfig(config) {
  const site = { ...config };
  site.defaultLocale = site.defaultLocale ? String(site.defaultLocale) : DEFAULT_LOCALE;
  site.activeLocales = Array.isArray(site.activeLocales)
    ? site.activeLocales.map(String).filter(Boolean)
    : LOCALES;
  if (!site.activeLocales.length) site.activeLocales = [site.defaultLocale];
  if (!site.activeLocales.includes(site.defaultLocale)) site.activeLocales.unshift(site.defaultLocale);
  site.locales = site.activeLocales;
  site.siteName ??= {};
  site.description ??= {};
  site.author ??= {};
  site.theme = typeof site.theme === "string" ? { name: site.theme } : site.theme;
  site.theme ??= {};
  site.theme.name = site.theme.name || "default";
  site.plugins = mergePlainDefaults(site.theme.plugins || {}, site.plugins || {});
  if (!site.plugins.comments && site.comments) site.plugins.comments = site.comments;
  normalizeCommentsPlugin(site);
  configureThemeI18n(site.theme.i18n || {});
  const themeCss = Array.isArray(site.theme.css) ? site.theme.css : [];
  const themeJs = Array.isArray(site.theme.js) ? site.theme.js : [];
  if (!themeCss.length && site.theme.style) themeCss.push(themeAssetUrl(site.theme.name, site.theme.style));
  if (!themeJs.length && site.theme.script) {
    themeJs.push({ src: themeAssetUrl(site.theme.name, site.theme.script), defer: true });
  }
  site.theme.css = themeCss;
  site.theme.js = themeJs;
  const pageStyleFiles = site.theme.pageStyles && typeof site.theme.pageStyles === "object" && !Array.isArray(site.theme.pageStyles)
    ? site.theme.pageStyles
    : {};
  site.theme.pageStyleFiles = pageStyleFiles;
  site.theme.pageStyles = Object.fromEntries(Object.entries(pageStyleFiles).map(([key, value]) => [
    key,
    Array.isArray(value)
      ? value.map((file) => themeAssetUrl(site.theme.name, file))
      : value ? [themeAssetUrl(site.theme.name, value)] : []
  ]));
  const pageScriptFiles = site.theme.pageScripts && typeof site.theme.pageScripts === "object" && !Array.isArray(site.theme.pageScripts)
    ? site.theme.pageScripts
    : {};
  site.theme.pageScriptFiles = pageScriptFiles;
  site.theme.pageScripts = Object.fromEntries(Object.entries(pageScriptFiles).map(([key, value]) => [
    key,
    Array.isArray(value)
      ? value.map((script) => typeof script === "string"
        ? { src: themeAssetUrl(site.theme.name, script), defer: true }
        : { ...script, src: script?.src && /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(String(script.src)) ? script.src : themeAssetUrl(site.theme.name, script.src), defer: script?.defer ?? true })
      : value ? [{ src: themeAssetUrl(site.theme.name, value), defer: true }] : []
  ]));
  const featureScriptFiles = site.theme.featureScripts && typeof site.theme.featureScripts === "object" && !Array.isArray(site.theme.featureScripts)
    ? site.theme.featureScripts
    : {};
  site.theme.featureScriptFiles = featureScriptFiles;
  site.theme.featureScripts = Object.fromEntries(Object.entries(featureScriptFiles).map(([key, value]) => [
    key,
    /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(String(value)) ? value : themeAssetUrl(site.theme.name, value)
  ]));
  const featureStyleFiles = site.theme.featureStyles && typeof site.theme.featureStyles === "object" && !Array.isArray(site.theme.featureStyles)
    ? site.theme.featureStyles
    : {};
  site.theme.featureStyleFiles = featureStyleFiles;
  site.theme.featureStyles = Object.fromEntries(Object.entries(featureStyleFiles).map(([key, value]) => [
    key,
    Array.isArray(value)
      ? value.map((file) => themeAssetUrl(site.theme.name, file))
      : value ? [themeAssetUrl(site.theme.name, value)] : []
  ]));
  site.theme.features = site.theme.features && typeof site.theme.features === "object" && !Array.isArray(site.theme.features)
    ? site.theme.features
    : {};
  site.theme.styles = Array.isArray(site.theme.styles) ? site.theme.styles : [];
  site.theme.scripts ??= {};
  site.theme.scripts.head = Array.isArray(site.theme.scripts.head) ? site.theme.scripts.head : [];
  site.theme.scripts.bodyEnd = Array.isArray(site.theme.scripts.bodyEnd) ? site.theme.scripts.bodyEnd : [];
  configurePluginScripts(site);
  site.scripts ??= {};
  site.scripts.head = Array.isArray(site.scripts.head) ? site.scripts.head : [];
  site.scripts.bodyEnd = Array.isArray(site.scripts.bodyEnd) ? site.scripts.bodyEnd : [];
  return site;
}

const COMMENT_PROVIDERS = new Set(["twikoo", "waline", "giscus", "utterances", "disqus", "custom"]);

function normalizeCommentsPlugin(site) {
  const comments = site.plugins?.comments;
  if (!comments || comments.enabled === false || comments.provider === false || comments.provider === "none") {
    site.plugins.comments = { enabled: false, provider: "none" };
    if (site.theme?.features) site.theme.features.comments = false;
    return;
  }

  const provider = String(comments.provider || "").trim().toLowerCase();
  if (!COMMENT_PROVIDERS.has(provider)) {
    site.plugins.comments = { ...comments, enabled: false, provider: "none" };
    if (site.theme?.features) site.theme.features.comments = false;
    return;
  }

  site.plugins.comments = { ...comments, enabled: true, provider };
  site.theme ??= {};
  site.theme.features ??= {};
  site.theme.features.comments = true;
}

function pluginAttrs(config = {}) {
  return config.attrs && typeof config.attrs === "object" && !Array.isArray(config.attrs) ? config.attrs : {};
}

function pushPluginScript(site, script = {}) {
  if (!script.src && !script.content && !script.inline) return;
  site.theme.scripts.bodyEnd.push(script);
}

function configurePluginScripts(site) {
  const analytics = site.plugins.analytics || {};
  const cloudflare = analytics.cloudflareWebAnalytics;
  if (cloudflare?.enabled && cloudflare.token) {
    const beacon = {
      token: String(cloudflare.token),
      ...(cloudflare.beacon && typeof cloudflare.beacon === "object" ? cloudflare.beacon : {})
    };
    pushPluginScript(site, {
      src: cloudflare.src || "https://static.cloudflareinsights.com/beacon.min.js",
      defer: cloudflare.defer ?? true,
      consent: cloudflare.consent || "analytics",
      "data-cf-beacon": JSON.stringify(beacon)
    });
  }

  const plausible = analytics.plausible;
  if (plausible?.enabled && plausible.domain) {
    pushPluginScript(site, {
      src: plausible.src || "https://plausible.io/js/script.js",
      defer: plausible.defer ?? true,
      consent: plausible.consent || "analytics",
      "data-domain": plausible.domain
    });
  }

  const umami = analytics.umami;
  if (umami?.enabled && umami.websiteId) {
    pushPluginScript(site, {
      src: umami.src || "https://analytics.example.com/script.js",
      defer: umami.defer ?? true,
      consent: umami.consent || "analytics",
      "data-website-id": umami.websiteId,
      ...pluginAttrs(umami)
    });
  }

  const googleAnalytics = analytics.googleAnalytics;
  if (googleAnalytics?.enabled && googleAnalytics.measurementId) {
    const id = String(googleAnalytics.measurementId);
    pushPluginScript(site, {
      src: googleAnalytics.src || `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`,
      async: googleAnalytics.async ?? true,
      consent: googleAnalytics.consent || "analytics"
    });
    pushPluginScript(site, {
      consent: googleAnalytics.consent || "analytics",
      content: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id.replaceAll("'", "\\'")}');`
    });
  }

  const advertising = site.plugins.advertising || {};
  const adsense = advertising.googleAdsense;
  if (adsense?.enabled && adsense.client) {
    const params = new URLSearchParams({ client: String(adsense.client) });
    if (adsense.host) params.set("host", String(adsense.host));
    const src = adsense.src || `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?${params}`;
    pushPluginScript(site, {
      src,
      async: adsense.async ?? true,
      crossorigin: adsense.crossorigin || "anonymous",
      consent: adsense.consent || "marketing",
      "data-ad-client": adsense.client,
      "data-ad-host": adsense.host,
      ...pluginAttrs(adsense)
    });
  }

  for (const script of [...(analytics.custom || []), ...(advertising.custom || [])]) {
    if (script?.enabled === false) continue;
    pushPluginScript(site, {
      defer: script?.defer ?? true,
      consent: script?.consent || "analytics",
      ...script,
      ...pluginAttrs(script)
    });
  }
}

export async function readSiteConfig() {
  const candidates = [
    path.join(rootDir, "config.yml"),
    path.join(rootDir, "_config.yml"),
    path.join(rootDir, "config", "site.yml"),
    path.join(contentDir, "site.config.json")
  ];
  for (const file of candidates) {
    if (!fsSync.existsSync(file)) continue;
    const rootConfig = await readConfigFile(file);
    const themeConfig = await readThemeConfig(rootConfig);
    const mergedConfig = mergePlainDefaults({
      theme: themeConfig,
      pagination: themeConfig.pagination,
      icons: themeConfig.icons,
      pwa: themeConfig.pwa,
      head: themeConfig.head,
      footer: themeConfig.footer,
      plugins: themeConfig.plugins
    }, {
      ...rootConfig,
      theme: mergePlainDefaults(themeConfig, typeof rootConfig.theme === "string" ? { name: rootConfig.theme } : rootConfig.theme)
    });
    return normalizeSiteConfig(mergedConfig);
  }
  throw new Error("Missing site config: expected config.yml, _config.yml, config/site.yml, or content/site.config.json");
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

export async function loadPosts(site = null) {
  const locales = site?.locales ?? LOCALES;
  const files = await fg("content/posts/*/index.*.md", { cwd: rootDir, onlyFiles: true });
  const posts = [];
  for (const file of files) {
    const locale = localeFromPostFilename(file);
    if (!locales.includes(locale)) continue;
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
      sitemap: parsed.data.sitemap,
      ogImage: DEFAULT_OG_IMAGE,
      ogImageWidth: OG_IMAGE_WIDTH,
      ogImageHeight: OG_IMAGE_HEIGHT,
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

export async function loadPages(site = null) {
  const locales = site?.locales ?? LOCALES;
  const files = await fg("content/pages/*.md", { cwd: rootDir, onlyFiles: true });
  const pages = [];
  for (const file of files) {
    const match = path.basename(file).match(/^(.+)\.(.+)\.md$/);
    if (!match) continue;
    const [, slug, locale] = match;
    if (!locales.includes(locale)) continue;
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
      sitemap: parsed.data.sitemap,
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

function translationsFor(group, localePath = (item) => item.url, locales = LOCALES) {
  return locales
    .map((locale) => group.find((item) => item.locale === locale))
    .filter(Boolean)
    .map((item) => ({ locale: item.locale, url: localePath(item), title: item.title }));
}

export async function loadBlogData() {
  const site = await readSiteConfig();
  const posts = await loadPosts(site);
  const pages = await loadPages(site);
  return { site, posts, pages };
}

export async function buildHtmlPages() {
  const { site, posts, pages } = await loadBlogData();
  const templates = await loadThemeTemplates(site);
  const locales = site.locales;
  const defaultLocale = site.defaultLocale;
  const routes = [];
  const add = (url, html) => routes.push({ url, html: rewriteRelativePaths(html, url) });
  const homePageSize = Math.max(1, Number(site.pagination?.homePageSize || 8));

  add("/", templates.renderRootPage({ site }));

  for (const locale of locales) {
    const localePosts = groupByLocale(posts, locale);
    const categoryMap = buildTermMap(posts, locale, "categories");
    const tagMap = buildTermMap(posts, locale, "tags");

    const totalHomePages = Math.max(1, Math.ceil(localePosts.length / homePageSize));
    const homePageUrl = (page) => page === 1 ? `/${locale}/` : `/${locale}/${"older/".repeat(page - 1)}`;
    for (let page = 1; page <= totalHomePages; page += 1) {
      add(homePageUrl(page), templates.renderHomePage({
        site,
        locale,
        posts: localePosts.slice((page - 1) * homePageSize, page * homePageSize),
        page,
        totalPages: totalHomePages,
        pageUrl: homePageUrl
      }));
    }
    add(`/${locale}/archive/`, templates.renderArchivePage({ site, locale, groups: archiveGroups(posts, locale) }));
    add(`/${locale}/categories/`, templates.renderTermIndexPage({
      site,
      locale,
      titleKey: "allCategories",
      descriptionKey: "categoriesDescription",
      terms: termList(categoryMap),
      url: `/${locale}/categories/`,
      current: "categories"
    }));
    add(`/${locale}/tags/`, templates.renderTermIndexPage({
      site,
      locale,
      titleKey: "allTags",
      descriptionKey: "tagsDescription",
      terms: termList(tagMap),
      url: `/${locale}/tags/`,
      current: "tags"
    }));
    add(`/${locale}/search/`, templates.renderSearchPage({ site, locale }));

    for (const term of categoryMap.values()) {
      const title = `${t(locale, "postsInCategory")}: ${term.name}`;
      const description = locale === "zh-CN"
        ? `查看「${term.name}」分类下的文章。`
        : locale === "zh-TW"
          ? `查看「${term.name}」分類下的文章。`
          : `Posts filed under ${term.name}.`;
      add(term.url, templates.renderTermPage({ site, locale, title, description, posts: term.posts, url: term.url, current: "categories", parentKey: "categories" }));
    }

    for (const term of tagMap.values()) {
      const title = `${t(locale, "postsWithTag")}: ${term.name}`;
      const description = locale === "zh-CN"
        ? `查看带有「${term.name}」标签的文章。`
        : locale === "zh-TW"
          ? `查看帶有「${term.name}」標籤的文章。`
          : `Posts tagged ${term.name}.`;
      add(term.url, templates.renderTermPage({ site, locale, title, description, posts: term.posts, url: term.url, current: "tags", parentKey: "tags" }));
    }
  }

  const postsByTranslation = groupBy(posts, (post) => post.translationKey);
  for (const group of postsByTranslation.values()) {
    const translations = translationsFor(group, (item) => item.url, locales);
    for (const post of group) {
      const localePosts = groupByLocale(posts, post.locale);
      const index = localePosts.findIndex((entry) => entry.url === post.url);
      const nextPost = index > 0 ? localePosts[index - 1] : null;
      const previousPost = index < localePosts.length - 1 ? localePosts[index + 1] : null;
      add(post.url, templates.renderPostPage({ site, locale: post.locale, post, translations, previousPost, nextPost }));
    }
  }

  const pagesByTranslation = groupBy(pages, (page) => page.translationKey);
  for (const group of pagesByTranslation.values()) {
    const translations = translationsFor(group, (item) => item.url, locales);
    for (const page of group) {
      if (page.slug === "about") {
      add(page.url, templates.renderAboutPage({ site, locale: page.locale, page, translations }));
      }
    }
  }

  return routes;
}

export async function buildNotFoundHtml() {
  const site = await readSiteConfig();
  const templates = await loadThemeTemplates(site);
  return rewriteRelativePaths(templates.renderNotFoundPage({ site }), "/404.html");
}

function rewriteRelativePaths(html, urlPath) {
  const fromDir = urlPath.endsWith("/") ? urlPath : path.posix.dirname(urlPath);
  return html.replace(/\b(href|src|poster|data-video-src)=["']\/(?!\/)([^"']+)["']/g, (match, attr, target, offset, fullHtml) => {
    const tagStart = fullHtml.lastIndexOf("<", offset);
    if (tagStart >= 0 && /^<base\b/i.test(fullHtml.slice(tagStart, offset))) return match;
    const cleanTarget = target.replace(/^\/+/, "");
    let prefix = path.posix.relative(fromDir.replace(/^\/|\/$/g, ""), path.posix.dirname(cleanTarget));
    if (!prefix) prefix = ".";
    return `${attr}="${prefix}/${path.posix.basename(cleanTarget)}"`;
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
  const robots = site.robots || {};
  const header = Array.isArray(robots.header)
    ? robots.header.map((line) => `# ${line}`).join("\n")
    : "";
  const signal = robots.contentSignal ? `Content-Signal: ${robots.contentSignal}\n\n` : "";
  const rules = Array.isArray(robots.rules) ? robots.rules : [{ userAgent: "*", allow: ["/"] }];
  const body = rules.map((rule) => {
    const lines = [`User-agent: ${rule.userAgent || "*"}`];
    for (const value of rule.allow || []) lines.push(`Allow: ${value}`);
    for (const value of rule.disallow || []) lines.push(`Disallow: ${value}`);
    return lines.join("\n");
  }).join("\n\n");
  return `${header}${header ? "\n" : ""}${signal}${body}

Sitemap: ${absoluteUrl(site, "/sitemap.xml")}
`;
}

export function buildLlmsTxt(site, posts) {
  const latest = posts.slice(0, 60);
  const languageLines = site.locales
    .map((locale) => `- ${localeLabel(locale)}: ${absoluteUrl(site, `/${locale}/`)}`)
    .join("\n");
  const articleLines = latest
    .map((post) => `- ${post.title}: ${absoluteUrl(site, post.markdownUrl)}`)
    .join("\n");
  return `# ${site.llms?.title || site.siteName[site.defaultLocale] || site.siteUrl}

${site.llms?.description || site.description[site.defaultLocale] || ""}

## Languages

${languageLines}

## Latest Markdown Mirrors

${articleLines}
`;
}

export function buildLlmsFullTxt(site, posts) {
  return `# ${site.llms?.title || site.siteName[site.defaultLocale] || site.siteUrl}

${posts.map((post) => `## ${post.title}

Summary: ${post.description}

URL: ${absoluteUrl(site, post.url)}

Markdown: ${absoluteUrl(site, post.markdownUrl)}

${rewriteMarkdownImages(post.markdownBody, post.baseDir, `posts/${post.slug}/${post.locale}`)}
`).join("\n")}
`;
}
