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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatDate(value, locale) {
    var date = new Date(String(value || "") + "T00:00:00Z");
    if (Number.isNaN(date.getTime())) return value || "";
    var dateLocale = locale === "en" ? "en-US" : locale;
    return new Intl.DateTimeFormat(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function scoreEntry(entry, tokens) {
    var title = normalizeText(entry.title);
    var description = normalizeText(entry.description);
    var category = normalizeText(entry.category);
    var tags = normalizeText((entry.tags || []).join(" "));
    var text = normalizeText(entry.text);
    var haystack = [title, description, category, tags, text].join(" ");
    var score = 0;

    for (var index = 0; index < tokens.length; index += 1) {
      var token = tokens[index];
      if (haystack.indexOf(token) < 0) return 0;
      if (title.indexOf(token) >= 0) score += 12;
      if (tags.indexOf(token) >= 0) score += 7;
      if (category.indexOf(token) >= 0) score += 5;
      if (description.indexOf(token) >= 0) score += 4;
      if (text.indexOf(token) >= 0) score += 1;
    }

    return score;
  }

  function renderSearchResult(entry, locale) {
    var tags = (entry.tags || []).map(function (tag) {
      return '<span class="search-tag">' + escapeHtml(tag) + "</span>";
    }).join("");
    var meta = [formatDate(entry.date, locale), entry.category].filter(Boolean).map(escapeHtml).join(" · ");
    return '<article class="post-card search-card">' +
      '<h3><a href="' + escapeHtml(entry.url) + '">' + escapeHtml(entry.title) + "</a></h3>" +
      '<p class="post-card-meta">' + meta + "</p>" +
      '<p>' + escapeHtml(entry.description) + "</p>" +
      (tags ? '<div class="search-tags">' + tags + "</div>" : "") +
      "</article>";
  }

  function setupSearch() {
    var root = document.querySelector("[data-search-root]");
    if (!root || !window.fetch) return;

    var input = root.querySelector("[data-search-input]");
    var form = root.querySelector("[data-search-form]");
    var status = root.querySelector("[data-search-status]");
    var results = root.querySelector("[data-search-results]");
    var locale = root.getAttribute("data-search-locale") || preferredLocale();
    var emptyText = root.getAttribute("data-search-empty") || "";
    var noResultsText = root.getAttribute("data-search-no-results") || "";
    var loadingText = root.getAttribute("data-search-loading") || "";
    var errorText = root.getAttribute("data-search-error") || "";
    var resultsLabel = root.getAttribute("data-search-results-label") || "";
    var index = [];

    function setStatus(message, isEmpty) {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("empty", Boolean(isEmpty));
    }

    function updateUrl(query) {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", url);
    }

    function runSearch() {
      var query = input ? input.value.trim() : "";
      var tokens = normalizeText(query).split(" ").filter(Boolean);
      updateUrl(query);
      results.innerHTML = "";

      if (!tokens.length) {
        setStatus(emptyText, true);
        return;
      }

      var matches = index
        .map(function (entry) {
          return { entry: entry, score: scoreEntry(entry, tokens) };
        })
        .filter(function (item) {
          return item.score > 0;
        })
        .sort(function (a, b) {
          return b.score - a.score || String(b.entry.date).localeCompare(String(a.entry.date));
        });

      if (!matches.length) {
        setStatus(noResultsText, true);
        return;
      }

      setStatus(matches.length + " " + resultsLabel, false);
      results.innerHTML = matches.slice(0, 30).map(function (item) {
        return renderSearchResult(item.entry, locale);
      }).join("");
    }

    setStatus(loadingText, true);

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        runSearch();
      });
    }

    if (input) {
      input.addEventListener("input", runSearch);
      var query = new URLSearchParams(window.location.search).get("q") || "";
      input.value = query;
    }

    fetch("/assets/search-index." + encodeURIComponent(locale) + ".json", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Search index request failed");
        return response.json();
      })
      .then(function (data) {
        index = Array.isArray(data) ? data : [];
        runSearch();
      })
      .catch(function () {
        setStatus(errorText, true);
      });
  }

  setupSearch();
})();
