(function () {
  "use strict";

  var STORAGE_KEY = "blog.privacy-consent";
  var REVISION = "2026-07-11.1";
  var OPTIONAL = ["preferences", "analytics", "marketing"];

  function locale() {
    var lang = (document.documentElement.lang || "en").toLowerCase();
    if (lang.indexOf("zh-tw") === 0 || lang.indexOf("zh-hant") === 0) return "zh-TW";
    if (lang.indexOf("zh") === 0) return "zh-CN";
    return "en";
  }

  var messages = {
    "zh-CN": {
      title: "隐私偏好",
      intro: "我们使用本地存储保存你的语言和隐私选择。分析、营销或其他可选第三方功能仅在你明确同意后加载。本站目前不出售个人信息，也不用于跨情境行为广告。",
      necessary: "必要功能",
      necessaryHelp: "用于安全、页面导航、语言和隐私选择，无法关闭。",
      preferences: "偏好功能",
      preferencesHelp: "记住非必要的个性化设置。",
      analytics: "统计分析",
      analyticsHelp: "帮助了解网站使用情况；当前未启用统计供应商。",
      marketing: "营销",
      marketingHelp: "广告或跨站追踪；当前未启用。",
      accept: "全部接受",
      reject: "仅必要",
      save: "保存选择",
      close: "关闭隐私设置",
      manage: "隐私设置",
      gpc: "浏览器已发送 Global Privacy Control 信号，营销与跨情境共享将保持关闭。",
      policy: "你可以随时在页脚重新打开此面板并撤回同意。"
    },
    "zh-TW": {
      title: "隱私偏好",
      intro: "我們使用本機儲存保存你的語言和隱私選擇。分析、行銷或其他可選第三方功能只會在你明確同意後載入。本站目前不出售個人資料，也不進行跨情境行為廣告。",
      necessary: "必要功能",
      necessaryHelp: "用於安全、頁面導覽、語言和隱私選擇，無法關閉。",
      preferences: "偏好功能",
      preferencesHelp: "記住非必要的個人化設定。",
      analytics: "統計分析",
      analyticsHelp: "協助瞭解網站使用情況；目前未啟用統計供應商。",
      marketing: "行銷",
      marketingHelp: "廣告或跨站追蹤；目前未啟用。",
      accept: "全部接受",
      reject: "僅必要",
      save: "儲存選擇",
      close: "關閉隱私設定",
      manage: "隱私設定",
      gpc: "瀏覽器已傳送 Global Privacy Control 訊號，行銷與跨情境分享將保持關閉。",
      policy: "你可以隨時在頁尾重新開啟此面板並撤回同意。"
    },
    en: {
      title: "Privacy preferences",
      intro: "We use local storage for language and privacy choices. Analytics, marketing, and other optional third-party features load only after your explicit consent. We currently do not sell personal information or use it for cross-context behavioural advertising.",
      necessary: "Necessary",
      necessaryHelp: "Required for security, navigation, language, and privacy choices. Always on.",
      preferences: "Preferences",
      preferencesHelp: "Remember optional personalisation choices.",
      analytics: "Analytics",
      analyticsHelp: "Measure site usage; no analytics provider is currently enabled.",
      marketing: "Marketing",
      marketingHelp: "Advertising or cross-site tracking; currently disabled.",
      accept: "Accept all",
      reject: "Necessary only",
      save: "Save choices",
      close: "Close privacy settings",
      manage: "Privacy settings",
      gpc: "Your browser sent a Global Privacy Control signal. Marketing and cross-context sharing will remain off.",
      policy: "You can reopen this panel from the footer and withdraw consent at any time."
    }
  };

  function text() {
    return messages[locale()] || messages.en;
  }

  function gpcEnabled() {
    return navigator.globalPrivacyControl === true;
  }

  function readChoice() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && value.revision === REVISION && value.categories ? value : null;
    } catch (error) {
      return null;
    }
  }

  function writeChoice(categories) {
    var normalized = { necessary: true };
    OPTIONAL.forEach(function (category) {
      normalized[category] = category === "marketing" && gpcEnabled() ? false : categories[category] === true;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        revision: REVISION,
        updatedAt: new Date().toISOString(),
        gpc: gpcEnabled(),
        categories: normalized
      }));
    } catch (error) {}
    document.documentElement.setAttribute("data-consent-choice", "saved");
    window.dispatchEvent(new CustomEvent("jsgripe:consentchange", { detail: normalized }));
    activateScripts(normalized);
    closePanel();
  }

  function activateScripts(categories) {
    document.querySelectorAll("script[type='text/plain'][data-consent-category]").forEach(function (placeholder) {
      var category = placeholder.getAttribute("data-consent-category") || "necessary";
      if (category !== "necessary" && categories[category] !== true) return;
      var script = document.createElement("script");
      Array.prototype.slice.call(placeholder.attributes).forEach(function (attribute) {
        if (["type", "data-consent-category", "data-consent-src"].indexOf(attribute.name) < 0) {
          script.setAttribute(attribute.name, attribute.value);
        }
      });
      var source = placeholder.getAttribute("data-consent-src");
      if (source) script.src = source;
      if (!source) script.text = placeholder.textContent || "";
      placeholder.replaceWith(script);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function categoryRow(key, label, help, checked, disabled) {
    return "<label class='consent-option'>" +
      "<span><strong>" + escapeHtml(label) + "</strong><small>" + escapeHtml(help) + "</small></span>" +
      "<input type='checkbox' data-consent-input='" + key + "'" + (checked ? " checked" : "") + (disabled ? " disabled" : "") + ">" +
      "<span class='consent-toggle' aria-hidden='true'></span></label>";
  }

  function createPanel() {
    var copy = text();
    var saved = readChoice();
    var selected = saved ? saved.categories : { necessary: true, preferences: false, analytics: false, marketing: false };
    var layer = document.createElement("div");
    layer.className = "consent-layer";
    layer.hidden = true;
    layer.setAttribute("data-consent-layer", "");
    layer.innerHTML = "<div class='consent-backdrop' data-consent-dismiss></div>" +
      "<section class='consent-panel' role='dialog' aria-modal='true' aria-labelledby='consent-title' aria-describedby='consent-description'>" +
      "<header class='consent-header'><div><p class='consent-eyebrow'>Privacy · 隐私 · 隱私</p><h2 id='consent-title'>" + escapeHtml(copy.title) + "</h2></div>" +
      "<button class='consent-close' type='button' data-consent-dismiss aria-label='" + escapeHtml(copy.close) + "'>×</button></header>" +
      "<p class='consent-copy' id='consent-description'>" + escapeHtml(copy.intro) + "</p>" +
      (gpcEnabled() ? "<p class='consent-gpc'>" + escapeHtml(copy.gpc) + "</p>" : "") +
      "<div class='consent-options'>" +
      categoryRow("necessary", copy.necessary, copy.necessaryHelp, true, true) +
      categoryRow("preferences", copy.preferences, copy.preferencesHelp, selected.preferences, false) +
      categoryRow("analytics", copy.analytics, copy.analyticsHelp, selected.analytics, false) +
      categoryRow("marketing", copy.marketing, copy.marketingHelp, gpcEnabled() ? false : selected.marketing, gpcEnabled()) +
      "</div><p class='consent-policy'>" + escapeHtml(copy.policy) + "</p>" +
      "<div class='consent-actions'><button type='button' data-consent-accept>" + escapeHtml(copy.accept) + "</button>" +
      "<button type='button' data-consent-reject>" + escapeHtml(copy.reject) + "</button>" +
      "<button type='button' data-consent-save>" + escapeHtml(copy.save) + "</button></div></section>";
    document.body.appendChild(layer);
    return layer;
  }

  function panel() {
    return document.querySelector("[data-consent-layer]") || createPanel();
  }

  function openPanel() {
    var layer = panel();
    layer.hidden = false;
    document.body.classList.add("consent-open");
    var heading = layer.querySelector("#consent-title");
    if (heading) heading.setAttribute("tabindex", "-1");
    if (heading) heading.focus();
  }

  function closePanel() {
    var layer = document.querySelector("[data-consent-layer]");
    if (layer) layer.hidden = true;
    document.body.classList.remove("consent-open");
  }

  function valuesFromPanel() {
    var values = {};
    document.querySelectorAll("[data-consent-input]").forEach(function (input) {
      values[input.getAttribute("data-consent-input")] = input.checked;
    });
    return values;
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-consent-manage]")) openPanel();
    if (event.target.closest("[data-consent-accept]")) writeChoice({ preferences: true, analytics: true, marketing: true });
    if (event.target.closest("[data-consent-reject]")) writeChoice({ preferences: false, analytics: false, marketing: false });
    if (event.target.closest("[data-consent-save]")) writeChoice(valuesFromPanel());
    if (event.target.closest("[data-consent-dismiss]")) {
      if (readChoice()) closePanel();
      else writeChoice({ preferences: false, analytics: false, marketing: false });
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel().hidden) {
      if (readChoice()) closePanel();
      else writeChoice({ preferences: false, analytics: false, marketing: false });
    }
  });

  window.JSGripeConsent = {
    allows: function (category) {
      if (!category || category === "necessary") return true;
      var choice = readChoice();
      return !!(choice && choice.categories[category] === true);
    },
    open: openPanel,
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (error) {}
      openPanel();
    }
  };

  var choice = readChoice();
  if (choice) {
    document.documentElement.setAttribute("data-consent-choice", "saved");
    activateScripts(choice.categories);
  } else {
    openPanel();
  }
})();
