export const LOCALES = ["zh-CN", "zh-TW", "en"];
export const RESERVED_LOCALES = ["ja"];
export const DEFAULT_LOCALE = "zh-CN";

export const localeMeta = {
  "zh-CN": {
    label: "简体中文",
    htmlLang: "zh-CN",
    dateLocale: "zh-CN"
  },
  en: {
    label: "English",
    htmlLang: "en",
    dateLocale: "en-US"
  },
  "zh-TW": {
    label: "繁體中文",
    htmlLang: "zh-TW",
    dateLocale: "zh-TW"
  },
  ja: {
    label: "日本語",
    htmlLang: "ja",
    dateLocale: "ja-JP"
  }
};

const dictionaries = {
  "zh-CN": {
    home: "首页",
    archive: "归档",
    categories: "分类",
    tags: "标签",
    search: "搜索",
    about: "关于",
    sitemap: "站点地图",
    latestPosts: "最新文章",
    allCategories: "所有分类",
    allTags: "所有标签",
    recentUpdates: "最近更新",
    languages: "语言入口",
    readMore: "继续阅读",
    published: "发布",
    updated: "更新",
    category: "分类",
    taggedWith: "标签",
    availableLanguages: "本文可用语言",
    backHome: "返回首页",
    newerPost: "上一篇",
    olderPost: "下一篇",
    noPosts: "暂时还没有文章。",
    postsInCategory: "分类文章",
    postsWithTag: "标签文章",
    archiveDescription: "按时间查看所有公开文章。",
    categoriesDescription: "按主题浏览文章。",
    tagsDescription: "按标签浏览文章。",
    searchDescription: "搜索公开文章、标签和摘要。",
    searchPlaceholder: "输入关键词",
    searchEmpty: "输入关键词开始搜索。",
    searchNoResults: "没有找到匹配的文章。",
    searchLoading: "正在加载搜索索引...",
    searchError: "搜索索引加载失败。",
    searchResultsCount: "条结果",
    aboutDescription: "关于这个写作空间。",
    rootTitle: "选择语言",
    rootIntro: "选择一个语言入口开始阅读。",
    notFoundTitle: "404：页面不存在",
    notFoundLead: "这个页面可能已经移动，或从未存在。",
    viewArchive: "查看归档",
    languageSwitch: "切换语言",
    articleEnd: "读到这里",
    skip: "跳到主内容",
    siteIntro: "记录技术实践、网络服务、写作与观察。",
    feed: "订阅"
  },
  "zh-TW": {
    home: "首頁",
    archive: "歸檔",
    categories: "分類",
    tags: "標籤",
    search: "搜尋",
    about: "關於",
    sitemap: "站點地圖",
    latestPosts: "最新文章",
    allCategories: "所有分類",
    allTags: "所有標籤",
    recentUpdates: "最近更新",
    languages: "語言入口",
    readMore: "繼續閱讀",
    published: "發布",
    updated: "更新",
    category: "分類",
    taggedWith: "標籤",
    availableLanguages: "本文可用語言",
    backHome: "返回首頁",
    newerPost: "上一篇",
    olderPost: "下一篇",
    noPosts: "暫時還沒有文章。",
    postsInCategory: "分類文章",
    postsWithTag: "標籤文章",
    archiveDescription: "按時間查看所有公開文章。",
    categoriesDescription: "按主題瀏覽文章。",
    tagsDescription: "按標籤瀏覽文章。",
    searchDescription: "搜尋公開文章、標籤與摘要。",
    searchPlaceholder: "輸入關鍵字",
    searchEmpty: "輸入關鍵字開始搜尋。",
    searchNoResults: "沒有找到符合的文章。",
    searchLoading: "正在載入搜尋索引...",
    searchError: "搜尋索引載入失敗。",
    searchResultsCount: "筆結果",
    aboutDescription: "關於這個寫作空間。",
    rootTitle: "選擇語言",
    rootIntro: "選擇一個語言入口開始閱讀。",
    notFoundTitle: "404：頁面不存在",
    notFoundLead: "這個頁面可能已經移動，或從未存在。",
    viewArchive: "查看歸檔",
    languageSwitch: "切換語言",
    articleEnd: "讀到這裡",
    skip: "跳到主內容",
    siteIntro: "記錄技術實踐、網路服務、寫作與觀察。",
    feed: "訂閱"
  },
  en: {
    home: "Home",
    archive: "Archive",
    categories: "Categories",
    tags: "Tags",
    search: "Search",
    about: "About",
    sitemap: "Sitemap",
    latestPosts: "Latest Posts",
    allCategories: "All Categories",
    allTags: "All Tags",
    recentUpdates: "Recent Updates",
    languages: "Languages",
    readMore: "Read more",
    published: "Published",
    updated: "Updated",
    category: "Category",
    taggedWith: "Tags",
    availableLanguages: "Available languages",
    backHome: "Back home",
    newerPost: "Newer post",
    olderPost: "Older post",
    noPosts: "No posts yet.",
    postsInCategory: "Posts in category",
    postsWithTag: "Posts tagged",
    archiveDescription: "Browse all public posts by date.",
    categoriesDescription: "Browse posts by topic.",
    tagsDescription: "Browse posts by tag.",
    searchDescription: "Search public posts, tags, and summaries.",
    searchPlaceholder: "Search posts",
    searchEmpty: "Enter a query to start searching.",
    searchNoResults: "No matching posts found.",
    searchLoading: "Loading search index...",
    searchError: "Could not load the search index.",
    searchResultsCount: "results",
    aboutDescription: "About this writing space.",
    rootTitle: "Choose a language",
    rootIntro: "Choose a language to start reading.",
    notFoundTitle: "404: Page not found",
    notFoundLead: "This page may have moved, or it may never have existed.",
    viewArchive: "View archive",
    languageSwitch: "Switch language",
    articleEnd: "End note",
    skip: "Skip to main content",
    siteIntro: "Notes on technical practice, web services, writing, and observation.",
    feed: "Feed"
  }
};

export function normalizeLocale(locale) {
  return LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function t(locale, key) {
  const normalized = normalizeLocale(locale);
  return dictionaries[normalized]?.[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
}

export function localeLabel(locale) {
  return localeMeta[locale]?.label ?? locale;
}

export function htmlLang(locale) {
  return localeMeta[locale]?.htmlLang ?? locale;
}

export function formatDate(value, locale) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeMeta[normalizeLocale(locale)].dateLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

export function languageHome(locale) {
  return `/${normalizeLocale(locale)}/`;
}

export function localeFromPath(pathname) {
  const first = pathname.split("/").filter(Boolean)[0];
  return LOCALES.includes(first) ? first : null;
}
