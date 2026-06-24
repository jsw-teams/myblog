import path from "node:path";
import fsSync from "node:fs";
import { formatDate, t } from "../i18n.mjs";
import {
  baseJsonLd,
  breadcrumbJsonLd,
  escapeHtml,
  localText,
  renderLanguageAvailability,
  renderLayout,
  renderPagination,
  renderPostList,
  renderTermLinks,
  siteDefaultLocale,
  siteLocales
} from "../templates.mjs";

function readTemplate(themeDir, templateDir, file) {
  const templatePath = path.join(themeDir, templateDir, file);
  return fsSync.existsSync(templatePath) ? fsSync.readFileSync(templatePath, "utf8") : "";
}

function renderHtmlTemplate(source, data) {
  return source
    .replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}/g, (_, key) => data[key] ?? "")
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => escapeHtml(data[key] ?? ""));
}

export function loadHtmlThemeTemplates(site, themeDir, templateDir) {
  const files = {
    home: readTemplate(themeDir, templateDir, "home.html"),
    archive: readTemplate(themeDir, templateDir, "archive.html"),
    termsIndex: readTemplate(themeDir, templateDir, "terms-index.html"),
    termsPage: readTemplate(themeDir, templateDir, "terms-page.html"),
    page: readTemplate(themeDir, templateDir, "page.html")
  };

  return {
    renderHomePage({ site, locale, posts, page = 1, totalPages = 1, pageUrl = (number) => number === 1 ? `/${locale}/` : `/${locale}/${"older/".repeat(number - 1)}` }) {
      if (!files.home) return null;
      const locales = siteLocales(site);
      const siteName = localText(site.siteName, locale, site);
      const main = renderHtmlTemplate(files.home, {
        siteName,
        intro: t(locale, "siteIntro"),
        latestPosts: t(locale, "latestPosts"),
        postList: renderPostList(posts, locale),
        pagination: renderPagination({ locale, page, totalPages, pageUrl })
      });
      return renderLayout({
        site,
        locale,
        title: siteName,
        description: localText(site.description, locale, site),
        url: pageUrl(page),
        current: "home",
        main,
        alternates: locales.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/` })).concat({ hreflang: "x-default", url: `/${siteDefaultLocale(site)}/` }),
        jsonLd: baseJsonLd(site, locale),
        styles: site.theme?.pageStyles?.home || [],
        scripts: site.theme?.pageScripts?.home || []
      });
    },

    renderArchivePage({ site, locale, groups }) {
      if (!files.archive) return null;
      const locales = siteLocales(site);
      const archiveList = groups.map((group) => `<section aria-labelledby="year-${group.year}">
        <h2 id="year-${group.year}">${escapeHtml(group.year)}</h2>
        <ul>
          ${group.posts.map((post) => `<li><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date, locale))}</time><a href="${post.url}">${escapeHtml(post.title)}</a></li>`).join("")}
        </ul>
      </section>`).join("");
      const main = renderHtmlTemplate(files.archive, {
        title: t(locale, "archive"),
        description: t(locale, "archiveDescription"),
        archiveList
      });
      return renderLayout({
        site,
        locale,
        title: t(locale, "archive"),
        description: t(locale, "archiveDescription"),
        url: `/${locale}/archive/`,
        current: "archive",
        main,
        alternates: locales.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/archive/` })).concat({ hreflang: "x-default", url: `/${siteDefaultLocale(site)}/archive/` }),
        robots: "noindex,follow",
        jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
          { name: t(locale, "home"), url: `/${locale}/` },
          { name: t(locale, "archive"), url: `/${locale}/archive/` }
        ])],
        styles: site.theme?.pageStyles?.archive || [],
        scripts: site.theme?.pageScripts?.archive || []
      });
    },

    renderTermIndexPage({ site, locale, titleKey, descriptionKey, terms, url, current }) {
      if (!files.termsIndex) return null;
      const locales = siteLocales(site);
      const main = renderHtmlTemplate(files.termsIndex, {
        title: t(locale, titleKey),
        description: t(locale, descriptionKey),
        terms: renderTermLinks(terms, t(locale, "noPosts"))
      });
      return renderLayout({
        site,
        locale,
        title: t(locale, titleKey),
        description: t(locale, descriptionKey),
        url,
        current,
        alternates: locales.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/${current}/` })).concat({ hreflang: "x-default", url: `/${siteDefaultLocale(site)}/${current}/` }),
        main,
        robots: "noindex,follow",
        jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
          { name: t(locale, "home"), url: `/${locale}/` },
          { name: t(locale, titleKey), url }
        ])],
        styles: site.theme?.pageStyles?.[current] || site.theme?.pageStyles?.term || [],
        scripts: site.theme?.pageScripts?.[current] || site.theme?.pageScripts?.term || []
      });
    },

    renderTermPage({ site, locale, title, description, posts, url, current, parentKey }) {
      if (!files.termsPage) return null;
      const main = renderHtmlTemplate(files.termsPage, {
        title,
        description,
        postList: renderPostList(posts, locale)
      });
      return renderLayout({
        site,
        locale,
        title,
        description,
        url,
        current,
        main,
        robots: "noindex,follow",
        jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
          { name: t(locale, "home"), url: `/${locale}/` },
          { name: t(locale, parentKey), url: `/${locale}/${current}/` },
          { name: title, url }
        ])],
        styles: site.theme?.pageStyles?.term || site.theme?.pageStyles?.[current] || [],
        scripts: site.theme?.pageScripts?.term || site.theme?.pageScripts?.[current] || []
      });
    },

    renderAboutPage({ site, locale, page, translations }) {
      if (!files.page) return null;
      const languageBlock = renderLanguageAvailability(locale, translations);
      const main = renderHtmlTemplate(files.page, {
        title: page.title,
        description: page.description,
        languages: languageBlock,
        content: page.html
      });
      const alternates = translations
        .map((entry) => ({ hreflang: entry.locale, url: entry.url }))
        .concat({ hreflang: "x-default", url: translations.find((entry) => entry.locale === siteDefaultLocale(site))?.url ?? translations[0].url });
      return renderLayout({
        site,
        locale,
        title: page.title,
        description: page.description,
        url: page.url,
        current: page.slug === "about" ? "about" : "",
        main,
        languageLinks: translations,
        alternates,
        jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
          { name: t(locale, "home"), url: `/${locale}/` },
          { name: page.title, url: page.url }
        ])],
        styles: site.theme?.pageStyles?.page || [],
        scripts: site.theme?.pageScripts?.page || []
      });
    }
  };
}
