(function () {
  var supported = ["zh-CN", "zh-TW", "en"];
  var storageKey = "blog.js.gripe.locale";

  function storedLocale() {
    try {
      var value = window.localStorage.getItem(storageKey);
      return supported.indexOf(value) >= 0 ? value : "";
    } catch (error) {
      return "";
    }
  }

  function saveLocale(locale) {
    if (supported.indexOf(locale) < 0) return;
    try {
      window.localStorage.setItem(storageKey, locale);
    } catch (error) {
      return;
    }
  }

  function browserLocale() {
    var languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var index = 0; index < languages.length; index += 1) {
      var language = String(languages[index]).toLowerCase();
      if (language === "zh-tw" || language === "zh-hk" || language === "zh-mo" || language.indexOf("zh-hant") === 0) return "zh-TW";
      if (language === "zh-cn" || language.indexOf("zh-hans") === 0 || language === "zh") return "zh-CN";
      if (language.indexOf("en") === 0) return "en";
    }
    return "zh-CN";
  }

  function preferredLocale() {
    return storedLocale() || browserLocale();
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("[data-locale-choice]");
    if (link) saveLocale(link.getAttribute("data-locale-choice"));
  });

  var pathParts = window.location.pathname.split("/").filter(Boolean);
  if (supported.indexOf(pathParts[0]) >= 0) {
    saveLocale(pathParts[0]);
  }

  var preferred = preferredLocale();
  document.documentElement.setAttribute("data-preferred-locale", preferred);

  if (document.body && document.body.getAttribute("data-root-language-picker") === "true") {
    var target = "/" + preferred + "/";
    window.location.replace(target);
  }
})();
