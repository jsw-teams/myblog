import { absoluteUrl, buildTermMap, groupByLocale, loadBlogData } from "./content.mjs";

const fallbackDate = "2026-04-27";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeDate(value, fallback = fallbackDate) {
  if (!value) return fallback;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
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

function translationsFor(group, localePath, locales) {
  return locales
    .map((locale) => group.find((item) => item.locale === locale))
    .filter(Boolean)
    .map((item) => ({ locale: item.locale, url: localePath(item) }));
}

function latestDate(items, fallback = fallbackDate) {
  return items.reduce((latest, item) => {
    const updated = normalizeDate(item.updated ?? item.date, fallback);
    return updated > latest ? updated : latest;
  }, fallback);
}

function isExcluded(url, options) {
  return (options.exclude || []).some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(url);
    const text = String(pattern);
    return text.endsWith("*") ? url.startsWith(text.slice(0, -1)) : url === text;
  });
}

export function serializeSitemap(site, entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map((entry) => `  <url>
    <loc>${escapeXml(absoluteUrl(site, entry.url))}</loc>
    <lastmod>${escapeXml(entry.updated)}</lastmod>${entry.changefreq ? `
    <changefreq>${escapeXml(entry.changefreq)}</changefreq>` : ""}${entry.priority ? `
    <priority>${escapeXml(entry.priority)}</priority>` : ""}
${entry.alternates.map((alt) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.locale)}" href="${escapeXml(absoluteUrl(site, alt.url))}" />`).join("\n")}
  </url>`).join("\n")}
</urlset>
`;
}

export async function buildSitemapXml() {
  const { site, posts, pages } = await loadBlogData();
  const options = site.sitemap || {};
  const locales = site.locales;
  const entries = [];
  const homePageSize = Math.max(1, Number(site.pagination?.homePageSize || 8));
  const siteUpdated = latestDate([...posts, ...pages]);
  const add = (url, updated, alternates = [], meta = {}) => {
    if (isExcluded(url, options)) return;
    entries.push({
      url,
      updated: normalizeDate(updated, fallbackDate),
      alternates,
      changefreq: meta.changefreq,
      priority: meta.priority
    });
  };

  add("/", siteUpdated, [], { changefreq: "daily", priority: "1.0" });

  for (const locale of locales) {
    const localePosts = groupByLocale(posts, locale);
    const totalHomePages = Math.max(1, Math.ceil(localePosts.length / homePageSize));
    const homeAlternates = locales.map((entryLocale) => ({ locale: entryLocale, url: `/${entryLocale}/` }));

    for (let page = 1; page <= totalHomePages; page += 1) {
      add(page === 1 ? `/${locale}/` : `/${locale}/${"older/".repeat(page - 1)}`, siteUpdated, page === 1 ? homeAlternates : [], {
        changefreq: page === 1 ? "daily" : "weekly",
        priority: page === 1 ? "0.9" : "0.5"
      });
    }
    add(`/${locale}/archive/`, siteUpdated, locales.map((entryLocale) => ({ locale: entryLocale, url: `/${entryLocale}/archive/` })), { changefreq: "weekly", priority: "0.5" });

    if (options.categories !== false) {
      const categoryMap = buildTermMap(posts, locale, "categories");
      add(`/${locale}/categories/`, siteUpdated, locales.map((entryLocale) => ({ locale: entryLocale, url: `/${entryLocale}/categories/` })), { changefreq: "weekly", priority: "0.4" });
      for (const term of categoryMap.values()) add(term.url, siteUpdated, [], { changefreq: "weekly", priority: "0.3" });
    }

    if (options.tags !== false) {
      const tagMap = buildTermMap(posts, locale, "tags");
      add(`/${locale}/tags/`, siteUpdated, locales.map((entryLocale) => ({ locale: entryLocale, url: `/${entryLocale}/tags/` })), { changefreq: "weekly", priority: "0.4" });
      for (const term of tagMap.values()) add(term.url, siteUpdated, [], { changefreq: "weekly", priority: "0.3" });
    }
  }

  const postsByTranslation = groupBy(posts.filter((post) => post.sitemap !== false), (post) => post.translationKey);
  for (const group of postsByTranslation.values()) {
    const alternates = translationsFor(group, (item) => item.url, locales);
    for (const post of group) add(post.url, post.updated, alternates, { changefreq: "monthly", priority: "0.6" });
  }

  const pagesByTranslation = groupBy(pages.filter((page) => page.sitemap !== false), (page) => page.translationKey);
  for (const group of pagesByTranslation.values()) {
    const alternates = translationsFor(group, (item) => item.url, locales);
    for (const page of group) add(page.url, page.updated, alternates, { changefreq: "monthly", priority: "0.5" });
  }

  return serializeSitemap(site, entries);
}
