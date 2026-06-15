import { formatDate, htmlLang, localeLabel, LOCALES, t } from "./i18n.mjs";

export const basePath = "";

export function withBase(urlPath) {
  const value = String(urlPath || "");
  if (!basePath || !value.startsWith("/") || value.startsWith("//")) return value;
  if (value === basePath || value.startsWith(`${basePath}/`)) return value;
  return `${basePath}${value}`;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJson(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

export function absoluteUrl(site, urlPath) {
  return new URL(urlPath, site.siteUrl).href;
}

function renderAttributes(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== false && value != null)
    .map(([key, value]) => value === true ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`)
    .join("");
}

function renderAlternateLinks(site, alternates = []) {
  return alternates
    .map((item) => `<link rel="alternate" hreflang="${escapeHtml(item.hreflang)}" href="${escapeHtml(absoluteUrl(site, item.url))}">`)
    .join("");
}

function renderJsonLd(items = []) {
  const flat = items.flat().filter(Boolean);
  if (!flat.length) return "";
  return `<script type="application/ld+json">${escapeJson(flat.length === 1 ? flat[0] : flat)}</script>`;
}

function schemaDateTime(value, timezone = "+08:00") {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    return text.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  }
  const date = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return date ? `${date}T00:00:00${timezone}` : undefined;
}

function imageType(imageUrl = "") {
  const path = new URL(imageUrl, "https://example.invalid").pathname.toLowerCase();
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".avif")) return "image/avif";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function renderNav(site, locale, current) {
  const navItems = [
    ["home", `/${locale}/`],
    ["archive", `/${locale}/archive/`],
    ["categories", `/${locale}/categories/`],
    ["tags", `/${locale}/tags/`],
    ["about", `/${locale}/about/`]
  ];
  const searchCurrentAttr = current === "search" ? ' aria-current="page"' : "";
  const localeLinks = LOCALES.map((entryLocale) => {
    const currentAttr = entryLocale === locale ? ' aria-current="page"' : "";
    return `<a href="${withBase(`/${entryLocale}/`)}" data-locale-choice="${entryLocale}"${currentAttr}>${escapeHtml(localeLabel(entryLocale))}</a>`;
  }).join("");

  return `<header class="site-header">
    <a class="brand" href="${withBase(`/${locale}/`)}" data-locale-choice="${locale}">
      <span class="brand-mark" aria-hidden="true">JS</span>
      <span>${escapeHtml(site.siteName[locale] ?? site.siteName["zh-CN"])}</span>
    </a>
    <nav class="site-nav" aria-label="${escapeHtml(t(locale, "home"))}">
      ${navItems.map(([key, href]) => {
        const currentAttr = current === key ? ' aria-current="page"' : "";
        return `<a href="${withBase(href)}"${currentAttr}>${escapeHtml(t(locale, key))}</a>`;
      }).join("")}
    </nav>
    <nav class="utility-nav" aria-label="${escapeHtml(t(locale, "search"))}">
      <a class="search-action" href="${withBase(`/${locale}/search/`)}"${searchCurrentAttr}><span aria-hidden="true">⌕</span><span>${escapeHtml(t(locale, "search"))}</span></a>
    </nav>
    <nav class="language-nav" aria-label="${escapeHtml(t(locale, "languageSwitch"))}">
      ${localeLinks}
    </nav>
  </header>`;
}

function renderFooter(site, locale) {
  return `<footer class="site-footer">
    <p class="footer-brand">&copy; ${new Date().getUTCFullYear()} ${escapeHtml(site.siteName[locale] ?? site.siteName["zh-CN"])}</p>
    <nav class="footer-links" aria-label="${escapeHtml(t(locale, "sitemap"))}">
      <a href="${withBase(`/${locale}/feed.xml`)}">${escapeHtml(t(locale, "feed"))}</a>
      <a href="${withBase(`/${locale}/about/`)}">${escapeHtml(t(locale, "privacy"))}</a>
      <a href="${withBase("/sitemap/")}">${escapeHtml(t(locale, "sitemap"))}</a>
    </nav>
  </footer>`;
}

export function baseJsonLd(site, locale) {
  const siteName = site.siteName[locale] ?? site.siteName["zh-CN"];
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: site.siteUrl,
      inLanguage: locale
    },
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: siteName,
      url: absoluteUrl(site, `/${locale}/`),
      description: site.description[locale] ?? site.description["zh-CN"],
      inLanguage: locale
    }
  ];
}

export function breadcrumbJsonLd(site, items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(site, item.url)
    }))
  };
}

export function renderLayout({
  site,
  locale,
  title,
  description,
  url,
  current = "",
  main,
  alternates = [],
  jsonLd = [],
  ogType = "website",
  ogImage = "/assets/og-default.jpg",
  ogImageWidth = 1200,
  ogImageHeight = 630,
  bodyAttrs = {}
}) {
  const siteName = site.siteName[locale] ?? site.siteName["zh-CN"];
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const canonical = absoluteUrl(site, url);
  const imageUrl = absoluteUrl(site, ogImage);
  const imageAlt = `${title} | ${siteName}`;
  return `<!doctype html>
<html lang="${escapeHtml(htmlLang(locale))}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${renderAlternateLinks(site, alternates)}
  <link rel="icon" href="${withBase("/assets/mascot-laptop.png")}" type="image/png">
  <link rel="alternate icon" href="${withBase("/favicon.ico")}" sizes="any">
  <link rel="icon" href="${withBase("/favicon-32x32.png")}" type="image/png">
  <link rel="apple-touch-icon" href="${withBase("/apple-touch-icon.png")}">
  <link rel="manifest" href="${withBase("/site.webmanifest")}">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteName)}" href="${withBase(`/${locale}/feed.xml`)}">
  <link rel="image_src" href="${escapeHtml(imageUrl)}">
  <meta itemprop="name" content="${escapeHtml(fullTitle)}">
  <meta itemprop="description" content="${escapeHtml(description)}">
  <meta itemprop="image" content="${escapeHtml(imageUrl)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:locale" content="${escapeHtml(htmlLang(locale).replace("-", "_"))}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="${escapeHtml(imageType(imageUrl))}">
  <meta property="og:image:width" content="${escapeHtml(ogImageWidth)}">
  <meta property="og:image:height" content="${escapeHtml(ogImageHeight)}">
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
  <script>window.JSGripeBasePath=${JSON.stringify(basePath)};</script>
  <link rel="stylesheet" href="${withBase("/assets/site.css?v=20260605-video-controls")}">
  ${renderJsonLd(jsonLd)}
</head>
<body${renderAttributes(bodyAttrs)}>
  <a class="skip-link" href="#main">${escapeHtml(t(locale, "skip"))}</a>
  ${renderNav(site, locale, current)}
  ${main}
  ${renderFooter(site, locale)}
  <script src="${withBase("/assets/client.js?v=20260603-region")}" defer></script>
</body>
</html>`;
}

export function renderLanguageAvailability(locale, translations) {
  if (!translations.length) return "";
  const links = translations.map((entry) => {
    const current = entry.locale === locale ? ' aria-current="page"' : "";
    return `<a href="${entry.url}" data-locale-choice="${entry.locale}"${current}>${escapeHtml(localeLabel(entry.locale))}</a>`;
  }).join(" <span aria-hidden=\"true\">|</span> ");
  return `<nav class="article-languages" aria-label="${escapeHtml(t(locale, "availableLanguages"))}">
    <span>${escapeHtml(t(locale, "availableLanguages"))}:</span>
    ${links}
  </nav>`;
}

export function renderPostCard(post, locale) {
  const tags = post.tags.map((tag) => `<a href="${post.tagUrls[tag]}">${escapeHtml(tag)}</a>`).join("");
  return `<article class="post-card">
    <h3><a href="${post.url}">${escapeHtml(post.title)}</a></h3>
    <p class="post-card-meta">${escapeHtml(formatDate(post.date, locale))} · <a href="${post.categoryUrl}">${escapeHtml(post.category)}</a></p>
    <p>${escapeHtml(post.description)}</p>
    <div class="tag-row">${tags}</div>
  </article>`;
}

function renderMediaPlayer(post, locale) {
  const media = post.media;
  if (!media || !media.video) return "";
  const title = media.title || post.title;
  const poster = media.poster || post.cover || post.ogImage;
  const captions = Array.isArray(media.captions) ? media.captions : [];
  const captionTracks = captions
    .filter((track) => track?.src)
    .map((track, index) => {
      const lang = track.lang || locale;
      const label = track.label || localeLabel(lang);
      return `<track kind="subtitles" src="${escapeHtml(track.src)}" srclang="${escapeHtml(lang)}" label="${escapeHtml(label)}"${track.default === true || index === 0 ? " default" : ""}>`;
    })
    .join("");
  const sourceType = media.type || "video/mp4";
  const transcriptLink = media.transcript ? `<a href="${escapeHtml(media.transcript)}">${escapeHtml(media.transcriptLabel || "Transcript")}</a>` : "";
  const downloadLink = media.download ? `<a href="${escapeHtml(media.download)}">${escapeHtml(media.downloadLabel || "Download video")}</a>` : "";
  const captionsLink = captions[0]?.download ? `<a href="${escapeHtml(captions[0].download)}">${escapeHtml(captions[0].downloadLabel || "Download captions")}</a>` : "";
  const links = [downloadLink, captionsLink, transcriptLink].filter(Boolean).join("");
  const defaultCaption = captions.find((track) => track.default) || captions[0];
  const captionSelector = captions.length
    ? `<div class="article-media-control" data-caption-track-root>
      <label>
        <span>${escapeHtml(media.captionTrackLabel || "字幕")}</span>
        <select data-caption-track-select>
          <option value="">${escapeHtml(media.captionTrackOffLabel || "关闭字幕")}</option>
          ${captions.map((track, index) => `<option value="${index}"${track === defaultCaption ? " selected" : ""}>${escapeHtml(track.label || localeLabel(track.lang || locale))}</option>`).join("")}
        </select>
      </label>
    </div>`
    : "";
  const audioTracks = Array.isArray(media.audioTracks) ? media.audioTracks.filter((track) => track?.src) : [];
  const defaultAudioTrack = audioTracks.find((track) => track.default) || audioTracks[0];
  const audioSelector = audioTracks.length
    ? `<div class="article-media-control" data-audio-track-root data-audio-track-default="${escapeHtml(defaultAudioTrack?.src || "")}">
      <label>
        <span>${escapeHtml(media.audioTrackLabel || "Audio track")}</span>
        <select data-audio-track-select>
          <option value="">${escapeHtml(media.audioTrackOffLabel || "Off")}</option>
          ${audioTracks.map((track) => `<option value="${escapeHtml(track.src)}"${track.src === defaultAudioTrack?.src ? " selected" : ""}>${escapeHtml(track.label || localeLabel(track.lang || locale))}</option>`).join("")}
        </select>
      </label>
      <audio preload="auto" data-audio-track-player${defaultAudioTrack?.src ? ` src="${escapeHtml(defaultAudioTrack.src)}"` : ""}></audio>
    </div>`
    : "";
  const mediaTools = audioSelector || captionSelector
    ? `<div class="article-media-tools">${audioSelector}${captionSelector}</div>`
    : "";
  const mainlandTitle = media.mainlandTitle || t(locale, "mediaRegionTitle");
  const mainlandMessage = media.mainlandMessage || t(locale, "mediaRegionMessage");
  const heading = media.title || media.description
    ? `<div class="article-media-heading">
      ${media.title ? `<h2 id="article-media-title">${escapeHtml(title)}</h2>` : ""}
      ${media.description ? `<p>${escapeHtml(media.description)}</p>` : ""}
    </div>`
    : "";
  const sectionLabel = media.title ? ' aria-labelledby="article-media-title"' : ` aria-label="${escapeHtml(title)}"`;
  return `<section class="article-media" data-region-media data-region-title="${escapeHtml(mainlandTitle)}" data-region-message="${escapeHtml(mainlandMessage)}"${poster ? ` data-region-poster="${escapeHtml(poster)}"` : ""}${sectionLabel}>
    ${heading}
    <div class="article-video-shell">
      <video class="article-video" controls playsinline preload="metadata"${poster ? ` poster="${escapeHtml(poster)}"` : ""}>
        <source data-video-src="${escapeHtml(media.video)}" type="${escapeHtml(sourceType)}">
        ${captionTracks}
      </video>
      ${mediaTools}
    </div>
    ${links ? `<nav class="article-media-links" aria-label="Media links">${links}</nav>` : ""}
  </section>`;
}

function renderCommentSection(post, locale) {
  return `<section class="article-comments"
    data-utterances-root
    data-utterances-repo="jsw-teams/myblog"
    data-utterances-issue-term="${escapeHtml(`Comments: ${post.title}`)}"
    data-utterances-label="blog-comment"
    data-utterances-theme="github-light"
    data-comments-readonly="${escapeHtml(t(locale, "commentsReadOnlyMainland"))}"
    data-comments-loading="${escapeHtml(t(locale, "commentsLoading"))}"
    data-comments-empty="${escapeHtml(t(locale, "commentsEmpty"))}"
    data-comments-error="${escapeHtml(t(locale, "commentsError"))}">
    <div class="section-heading">
      <h2>${escapeHtml(t(locale, "commentsTitle"))}</h2>
    </div>
    <p class="comments-note">${escapeHtml(t(locale, "commentsRules"))}</p>
    <p class="comments-status" data-comments-status>${escapeHtml(t(locale, "commentsLoading"))}</p>
    <div class="comments-list" data-comments-list></div>
    <div data-utterances-mount></div>
  </section>`;
}

function renderTermLinks(terms, emptyText) {
  if (!terms.length) return `<p class="empty">${escapeHtml(emptyText)}</p>`;
  return `<ul class="term-grid">
    ${terms.map((term) => `<li><a href="${term.url}"><span>${escapeHtml(term.name)}</span><strong>${term.count}</strong></a></li>`).join("")}
  </ul>`;
}

function renderPostList(posts, locale) {
  if (!posts.length) return `<p class="empty">${escapeHtml(t(locale, "noPosts"))}</p>`;
  return `<div class="post-list">${posts.map((post) => renderPostCard(post, locale)).join("")}</div>`;
}

export function renderHomePage({ site, locale, posts }) {
  const description = site.description[locale] ?? site.description["zh-CN"];
  const main = `<main id="main" class="page-main home-main">
    <section class="home-hero" aria-labelledby="home-title">
      <div>
        <h1 id="home-title">${escapeHtml(site.siteName[locale] ?? site.siteName["zh-CN"])}</h1>
        <p class="lead">${escapeHtml(t(locale, "siteIntro"))}</p>
      </div>
      <img class="hero-mascot pixel-art" src="/assets/mascot-laptop.png" alt="" width="280" height="301">
    </section>
    <section class="home-section" aria-labelledby="latest-posts">
      <div class="section-heading">
        <h2 id="latest-posts">${escapeHtml(t(locale, "latestPosts"))}</h2>
      </div>
      ${renderPostList(posts, locale)}
    </section>
  </main>`;
  return renderLayout({
    site,
    locale,
    title: site.siteName[locale] ?? site.siteName["zh-CN"],
    description,
    url: `/${locale}/`,
    current: "home",
    main,
    alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/` })).concat({ hreflang: "x-default", url: "/" }),
    jsonLd: baseJsonLd(site, locale)
  });
}

export function renderRootPage({ site }) {
  const locale = "zh-CN";
  const description = "选择语言入口开始阅读。選擇語言入口開始閱讀。 Choose a language to start reading.";
  const languageButtons = LOCALES.map((entryLocale, index) => {
    const className = index === 0 ? "button-link" : "button-link button-link-secondary";
    return `<a class="${className}" href="/${entryLocale}/" data-locale-choice="${entryLocale}">${escapeHtml(localeLabel(entryLocale))}</a>`;
  }).join("");
  const main = `<main id="main" class="page-main root-picker">
    <section class="language-choice" aria-labelledby="root-title">
      <img src="/assets/mascot-reading.png" alt="" width="230" height="345">
      <div>
        <h1 id="root-title">${escapeHtml(site.siteName["zh-CN"])} / ${escapeHtml(site.siteName.en)}</h1>
        <p class="lead">${escapeHtml(description)}</p>
        <div class="language-choice-links">
          ${languageButtons}
        </div>
      </div>
    </section>
  </main>`;
  return renderLayout({
    site,
    locale,
    title: `${site.siteName["zh-CN"]} / ${site.siteName.en}`,
    description,
    url: "/",
    current: "",
    main,
    alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/` })).concat({ hreflang: "x-default", url: "/" }),
    jsonLd: baseJsonLd(site, locale),
    bodyAttrs: { "data-root-language-picker": "true" }
  });
}

export function renderPostPage({ site, locale, post, translations, previousPost, nextPost }) {
  const languageBlock = renderLanguageAvailability(locale, translations);
  const meta = [
    `${t(locale, "published")}: ${formatDate(post.date, locale)}`,
    `${t(locale, "updated")}: ${formatDate(post.updated, locale)}`,
    `${t(locale, "category")}: <a href="${post.categoryUrl}">${escapeHtml(post.category)}</a>`
  ].join(" · ");
  const tagLinks = post.tags.map((tag) => `<a href="${post.tagUrls[tag]}">${escapeHtml(tag)}</a>`).join("");
  const articleJson = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: locale,
    author: {
      "@type": "Person",
      name: site.author?.[locale] ?? site.author?.["zh-CN"] ?? site.siteName[locale]
    },
    mainEntityOfPage: absoluteUrl(site, post.url),
    image: absoluteUrl(site, post.ogImage),
    keywords: post.tags
  };
  const videoJson = post.media?.video ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.media.title || post.title,
    description: post.media.description || post.description,
    uploadDate: schemaDateTime(post.media.uploadDate || post.date),
    thumbnailUrl: post.media.poster ? absoluteUrl(site, post.media.poster) : absoluteUrl(site, post.ogImage),
    contentUrl: absoluteUrl(site, post.media.video),
    embedUrl: post.media.embed ? absoluteUrl(site, post.media.embed) : undefined,
    inLanguage: locale
  } : null;
  const breadcrumb = breadcrumbJsonLd(site, [
    { name: t(locale, "home"), url: `/${locale}/` },
    { name: t(locale, "archive"), url: `/${locale}/archive/` },
    { name: post.title, url: post.url }
  ]);
  const main = `<main id="main" class="page-main article-main">
    <article class="article-shell">
      <header class="article-header">
        <h1>${escapeHtml(post.title)}</h1>
        <p class="lead">${escapeHtml(post.description)}</p>
        ${languageBlock}
        <p class="article-meta">${meta}</p>
        <div class="tag-row" aria-label="${escapeHtml(t(locale, "taggedWith"))}">${tagLinks}</div>
      </header>
      ${renderMediaPlayer(post, locale)}
      <div class="prose">
        ${post.html}
      </div>
      ${renderCommentSection(post, locale)}
      <footer class="article-footer">
        <div class="article-end">
          <img src="/assets/mascot-happy.png" alt="" width="130" height="174">
          <span>${escapeHtml(t(locale, "articleEnd"))}</span>
        </div>
        <nav class="post-neighbors" aria-label="${escapeHtml(t(locale, "archive"))}">
          ${nextPost ? `<a href="${nextPost.url}"><span>${escapeHtml(t(locale, "newerPost"))}</span><strong>${escapeHtml(nextPost.title)}</strong></a>` : "<span></span>"}
          ${previousPost ? `<a href="${previousPost.url}"><span>${escapeHtml(t(locale, "olderPost"))}</span><strong>${escapeHtml(previousPost.title)}</strong></a>` : "<span></span>"}
        </nav>
        <p><a class="button-link button-link-secondary" href="/${locale}/">${escapeHtml(t(locale, "backHome"))}</a></p>
      </footer>
    </article>
  </main>`;
  const alternates = translations
    .map((entry) => ({ hreflang: entry.locale, url: entry.url }))
    .concat({ hreflang: "x-default", url: translations.find((entry) => entry.locale === "zh-CN")?.url ?? translations[0].url });
  return renderLayout({
    site,
    locale,
    title: post.title,
    description: post.description,
    url: post.url,
    current: "archive",
    main,
    alternates,
    jsonLd: [baseJsonLd(site, locale), articleJson, videoJson, breadcrumb],
    ogType: "article",
    ogImage: post.ogImage,
    ogImageWidth: post.ogImageWidth,
    ogImageHeight: post.ogImageHeight
  });
}

export function renderTermIndexPage({ site, locale, titleKey, descriptionKey, terms, url, current }) {
  const main = `<main id="main" class="page-main list-main">
    <header class="page-heading">
      <h1>${escapeHtml(t(locale, titleKey))}</h1>
      <p class="lead">${escapeHtml(t(locale, descriptionKey))}</p>
    </header>
    ${renderTermLinks(terms, t(locale, "noPosts"))}
  </main>`;
  return renderLayout({
    site,
    locale,
    title: t(locale, titleKey),
    description: t(locale, descriptionKey),
    url,
    current,
    main,
    alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/${current}/` })).concat({ hreflang: "x-default", url: `/zh-CN/${current}/` }),
    jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
      { name: t(locale, "home"), url: `/${locale}/` },
      { name: t(locale, titleKey), url }
    ])]
  });
}

export function renderSearchPage({ site, locale }) {
  const main = `<main id="main" class="page-main list-main">
    <header class="page-heading">
      <h1>${escapeHtml(t(locale, "search"))}</h1>
      <p class="lead">${escapeHtml(t(locale, "searchDescription"))}</p>
    </header>
    <section class="search-panel" data-search-root data-search-locale="${escapeHtml(locale)}" data-search-empty="${escapeHtml(t(locale, "searchEmpty"))}" data-search-no-results="${escapeHtml(t(locale, "searchNoResults"))}" data-search-loading="${escapeHtml(t(locale, "searchLoading"))}" data-search-error="${escapeHtml(t(locale, "searchError"))}" data-search-results-label="${escapeHtml(t(locale, "searchResultsCount"))}">
      <form class="search-form" data-search-form role="search">
        <label class="visually-hidden" for="search-input">${escapeHtml(t(locale, "search"))}</label>
        <input id="search-input" class="search-input" data-search-input type="search" name="q" autocomplete="off" placeholder="${escapeHtml(t(locale, "searchPlaceholder"))}">
      </form>
      <p class="search-status empty" data-search-status aria-live="polite">${escapeHtml(t(locale, "searchLoading"))}</p>
      <div class="search-results" data-search-results></div>
    </section>
  </main>`;
  return renderLayout({
    site,
    locale,
    title: t(locale, "search"),
    description: t(locale, "searchDescription"),
    url: `/${locale}/search/`,
    current: "search",
    main,
    alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/search/` })).concat({ hreflang: "x-default", url: "/zh-CN/search/" }),
    jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
      { name: t(locale, "home"), url: `/${locale}/` },
      { name: t(locale, "search"), url: `/${locale}/search/` }
    ])]
  });
}

export function renderTermPage({ site, locale, title, description, posts, url, current, parentKey }) {
  const main = `<main id="main" class="page-main list-main">
    <header class="page-heading">
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">${escapeHtml(description)}</p>
    </header>
    ${renderPostList(posts, locale)}
  </main>`;
  return renderLayout({
    site,
    locale,
    title,
    description,
    url,
    current,
    main,
    jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
      { name: t(locale, "home"), url: `/${locale}/` },
      { name: t(locale, parentKey), url: `/${locale}/${current}/` },
      { name: title, url }
    ])]
  });
}

export function renderArchivePage({ site, locale, groups }) {
  const main = `<main id="main" class="page-main list-main">
    <header class="page-heading">
      <h1>${escapeHtml(t(locale, "archive"))}</h1>
      <p class="lead">${escapeHtml(t(locale, "archiveDescription"))}</p>
    </header>
    <div class="archive-list">
      ${groups.map((group) => `<section aria-labelledby="year-${group.year}">
        <h2 id="year-${group.year}">${escapeHtml(group.year)}</h2>
        <ul>
          ${group.posts.map((post) => `<li><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date, locale))}</time><a href="${post.url}">${escapeHtml(post.title)}</a></li>`).join("")}
        </ul>
      </section>`).join("")}
    </div>
  </main>`;
  return renderLayout({
    site,
    locale,
    title: t(locale, "archive"),
    description: t(locale, "archiveDescription"),
    url: `/${locale}/archive/`,
    current: "archive",
    main,
    alternates: LOCALES.map((entryLocale) => ({ hreflang: entryLocale, url: `/${entryLocale}/archive/` })).concat({ hreflang: "x-default", url: "/zh-CN/archive/" }),
    jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
      { name: t(locale, "home"), url: `/${locale}/` },
      { name: t(locale, "archive"), url: `/${locale}/archive/` }
    ])]
  });
}

export function renderAboutPage({ site, locale, page, translations }) {
  const languageBlock = renderLanguageAvailability(locale, translations);
  const main = `<main id="main" class="page-main article-main">
    <article class="article-shell">
      <header class="article-header">
        <h1>${escapeHtml(page.title)}</h1>
        <p class="lead">${escapeHtml(page.description)}</p>
        ${languageBlock}
      </header>
      <div class="prose">${page.html}</div>
    </article>
  </main>`;
  const alternates = translations
    .map((entry) => ({ hreflang: entry.locale, url: entry.url }))
    .concat({ hreflang: "x-default", url: translations.find((entry) => entry.locale === "zh-CN")?.url ?? translations[0].url });
  return renderLayout({
    site,
    locale,
    title: page.title,
    description: page.description,
    url: page.url,
    current: "about",
    main,
    alternates,
    jsonLd: [baseJsonLd(site, locale), breadcrumbJsonLd(site, [
      { name: t(locale, "home"), url: `/${locale}/` },
      { name: page.title, url: page.url }
    ])]
  });
}

export function renderNotFoundPage({ site }) {
  const locale = "zh-CN";
  const description = "页面不存在。頁面不存在。 This page was not found.";
  const main = `<main id="main" class="page-main not-found-main">
    <section class="not-found-panel" data-i18n-panel="zh-CN" aria-labelledby="not-found-zh">
      <img src="/assets/mascot-404.png" alt="" width="300" height="450">
      <div>
        <h1 id="not-found-zh">404：页面不存在</h1>
        <p class="lead">这个页面可能已经移动，或从未存在。</p>
        <div class="hero-links">
          <a class="button-link" href="/zh-CN/">返回首页</a>
          <a class="button-link button-link-secondary" href="/zh-CN/archive/">查看归档</a>
          <a href="/zh-TW/" data-locale-choice="zh-TW">繁體中文</a>
          <a href="/en/" data-locale-choice="en">English</a>
        </div>
      </div>
    </section>
    <section class="not-found-panel" data-i18n-panel="zh-TW" aria-labelledby="not-found-zh-tw">
      <img src="/assets/mascot-404.png" alt="" width="300" height="450">
      <div>
        <h1 id="not-found-zh-tw">404：頁面不存在</h1>
        <p class="lead">這個頁面可能已經移動，或從未存在。</p>
        <div class="hero-links">
          <a class="button-link" href="/zh-TW/">返回首頁</a>
          <a class="button-link button-link-secondary" href="/zh-TW/archive/">查看歸檔</a>
          <a href="/zh-CN/" data-locale-choice="zh-CN">简体中文</a>
          <a href="/en/" data-locale-choice="en">English</a>
        </div>
      </div>
    </section>
    <section class="not-found-panel" data-i18n-panel="en" aria-labelledby="not-found-en">
      <img src="/assets/mascot-404.png" alt="" width="300" height="450">
      <div>
        <h1 id="not-found-en">404: Page not found</h1>
        <p class="lead">This page may have moved, or it may never have existed.</p>
        <div class="hero-links">
          <a class="button-link" href="/en/">Back home</a>
          <a class="button-link button-link-secondary" href="/en/archive/">View archive</a>
          <a href="/zh-CN/" data-locale-choice="zh-CN">简体中文</a>
          <a href="/zh-TW/" data-locale-choice="zh-TW">繁體中文</a>
        </div>
      </div>
    </section>
  </main>`;
  return renderLayout({
    site,
    locale,
    title: "404",
    description,
    url: "/404.html",
    main,
    jsonLd: baseJsonLd(site, locale),
    bodyAttrs: { "data-not-found": "true" }
  });
}
