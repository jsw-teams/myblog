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

  function readJsonStorage(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null");
    } catch (error) {
      return null;
    }
  }

  function writeJsonStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function normalizeCountry(value) {
    return String(value || "").trim().toUpperCase();
  }

  var regionPromise = null;

  function detectMainlandChina() {
    if (regionPromise) return regionPromise;
    regionPromise = new Promise(function (resolve) {
      var forced = new URLSearchParams(window.location.search).get("region");
      if (forced && normalizeCountry(forced) === "CN") {
        resolve(true);
        return;
      }

      var cached = readJsonStorage("privacy_plugins_region_v1");
      if (cached && cached.country && Date.now() - Number(cached.time || 0) < 86400000) {
        resolve(normalizeCountry(cached.country) === "CN");
        return;
      }

      if (!window.fetch) {
        resolve(isMainlandTimezoneFallback());
        return;
      }

      fetch("/cdn-cgi/trace", { cache: "no-store", credentials: "omit" })
        .then(function (response) {
          if (!response.ok) throw new Error("trace unavailable");
          return response.text();
        })
        .then(function (trace) {
          var match = trace.match(/^loc=([A-Z]{2})$/m);
          var country = match ? normalizeCountry(match[1]) : "";
          if (country) writeJsonStorage("privacy_plugins_region_v1", { country: country, time: Date.now() });
          resolve(country === "CN");
        })
        .catch(function () {
          resolve(isMainlandTimezoneFallback());
        });
    });
    return regionPromise;
  }

  function isMainlandTimezoneFallback() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Shanghai";
    } catch (error) {
      return false;
    }
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

  function setupImageLightbox() {
    var images = Array.prototype.slice.call(document.querySelectorAll(".prose img"));
    if (!images.length) return;

    var activeTrigger = null;
    var previousOverflow = "";
    var overlay = document.createElement("div");
    var closeButton = document.createElement("button");
    var preview = document.createElement("img");

    overlay.className = "image-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-hidden", "true");

    closeButton.className = "image-lightbox-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close image preview");
    closeButton.textContent = "×";

    preview.className = "image-lightbox-preview";
    preview.alt = "";

    overlay.appendChild(closeButton);
    overlay.appendChild(preview);
    document.body.appendChild(overlay);

    function closeLightbox() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      preview.removeAttribute("src");
      document.body.style.overflow = previousOverflow;
      if (activeTrigger && typeof activeTrigger.focus === "function") activeTrigger.focus();
      activeTrigger = null;
    }

    function openLightbox(image) {
      activeTrigger = image;
      previousOverflow = document.body.style.overflow;
      preview.src = image.currentSrc || image.src;
      preview.alt = image.alt || "";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeButton.focus();
    }

    images.forEach(function (image) {
      if (image.closest("a")) return;
      image.classList.add("js-lightbox-image");
      image.setAttribute("role", "button");
      image.setAttribute("tabindex", "0");
      image.setAttribute("aria-label", image.alt ? "Open image preview: " + image.alt : "Open image preview");

      image.addEventListener("click", function () {
        openLightbox(image);
      });

      image.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openLightbox(image);
      });
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target === closeButton || event.target === preview) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) closeLightbox();
    });
  }

  function setupArticleAudioTracks() {
    var roots = Array.prototype.slice.call(document.querySelectorAll("[data-audio-track-root]"));
    roots.forEach(function (root) {
      var select = root.querySelector("[data-audio-track-select]");
      var player = root.querySelector("[data-audio-track-player]");
      var shell = root.closest(".article-video-shell");
      var video = shell ? shell.querySelector("video") : null;
      if (!select || !player || !video) return;

      var active = false;
      var originalMuted = video.muted;

      function syncPlayer(force) {
        if (!active) return;
        if (!video.muted) video.muted = true;
        player.playbackRate = video.playbackRate || 1;
        player.volume = video.volume;
        if (force || Math.abs((player.currentTime || 0) - (video.currentTime || 0)) > 0.25) {
          try {
            player.currentTime = video.currentTime || 0;
          } catch (error) {
            return;
          }
        }
        if (video.paused || video.ended) {
          player.pause();
          return;
        }
        var playPromise = player.play();
        if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
      }

      function disableTrack() {
        if (active) video.muted = originalMuted;
        active = false;
        root.classList.remove("is-active");
        player.pause();
        player.removeAttribute("src");
        player.load();
      }

      function setTrack() {
        var next = select.value || "";
        if (!next) {
          disableTrack();
          return;
        }
        if (!active) originalMuted = video.muted;
        active = true;
        root.classList.add("is-active");
        video.muted = true;
        if (player.getAttribute("src") !== next) {
          player.src = next;
          player.load();
        }
        syncPlayer(true);
      }

      select.addEventListener("change", setTrack);
      video.addEventListener("play", function () { syncPlayer(true); });
      video.addEventListener("pause", function () { syncPlayer(false); });
      video.addEventListener("seeked", function () { syncPlayer(true); });
      video.addEventListener("seeking", function () { syncPlayer(true); });
      video.addEventListener("timeupdate", function () { syncPlayer(false); });
      video.addEventListener("ratechange", function () { syncPlayer(false); });
      video.addEventListener("volumechange", function () { syncPlayer(false); });
      video.addEventListener("ended", function () { player.pause(); });
      setTrack();
    });
  }

  function setupArticleCaptionTracks() {
    var roots = Array.prototype.slice.call(document.querySelectorAll("[data-caption-track-root]"));
    roots.forEach(function (root) {
      var select = root.querySelector("[data-caption-track-select]");
      var shell = root.closest(".article-video-shell");
      var video = shell ? shell.querySelector("video") : null;
      if (!select || !video || !video.textTracks) return;

      function setCaption() {
        var selected = select.value === "" ? -1 : Number(select.value);
        for (var index = 0; index < video.textTracks.length; index += 1) {
          var track = video.textTracks[index];
          track.mode = index === selected ? "showing" : "disabled";
        }
      }

      select.addEventListener("change", setCaption);
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) setCaption();
      else video.addEventListener("loadedmetadata", setCaption, { once: true });
    });
  }

  function setupRegionMedia() {
    var sections = Array.prototype.slice.call(document.querySelectorAll("[data-region-media]"));
    if (!sections.length) return;

    detectMainlandChina().then(function (isMainland) {
      sections.forEach(function (section) {
        var shell = section.querySelector(".article-video-shell");
        var video = section.querySelector("video");
        if (!shell || !video) return;

        if (isMainland) {
          var title = section.getAttribute("data-region-title") || "Video unavailable";
          var message = section.getAttribute("data-region-message") || "";
          var poster = section.getAttribute("data-region-poster") || video.getAttribute("poster") || "";
          video.pause();
          shell.innerHTML = '<div class="article-media-region-card">' +
            (poster ? '<img src="' + escapeHtml(poster) + '" alt="" loading="lazy" decoding="async">' : "") +
            '<div><h2>' + escapeHtml(title) + '</h2>' +
            '<p>' + escapeHtml(message) + '</p></div>' +
            "</div>";
          return;
        }

        Array.prototype.slice.call(video.querySelectorAll("source[data-video-src]")).forEach(function (source) {
          source.src = source.getAttribute("data-video-src") || "";
        });
        video.load();
      });
    });
  }

  function setupIssueComments() {
    var roots = Array.prototype.slice.call(document.querySelectorAll("[data-comments-root]"));
    if (!roots.length || !window.fetch) return;

    detectMainlandChina().then(function (isMainland) {
      roots.forEach(function (root) {
        loadIssueComments(root, isMainland);
      });
    });
  }

  function setCommentStatus(root, message, isError) {
    var status = root.querySelector("[data-comments-status]");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function setCommentAction(root, href, label) {
    var actions = root.querySelector("[data-comments-actions]");
    if (!actions) return;
    actions.innerHTML = "";
    if (!href || !label) return;
    var link = document.createElement("a");
    link.className = "button-link";
    link.href = href;
    link.rel = "nofollow noopener noreferrer";
    link.target = "_blank";
    link.textContent = label;
    actions.appendChild(link);
  }

  function renderComments(root, comments) {
    var list = root.querySelector("[data-comments-list]");
    if (!list) return;
    list.innerHTML = "";
    comments.forEach(function (comment) {
      var article = document.createElement("article");
      article.className = "comment-card";

      var header = document.createElement("header");
      var avatar = document.createElement("img");
      var title = document.createElement("p");
      var link = document.createElement("a");
      var time = document.createElement("time");
      var body = document.createElement("p");

      avatar.src = comment.user && comment.user.avatar_url ? comment.user.avatar_url : "";
      avatar.alt = "";
      avatar.loading = "lazy";
      avatar.decoding = "async";
      link.href = comment.html_url || "#";
      link.rel = "nofollow noopener noreferrer";
      link.target = "_blank";
      link.textContent = comment.user && comment.user.login ? comment.user.login : "GitHub user";
      time.dateTime = comment.created_at || "";
      time.textContent = comment.created_at ? new Date(comment.created_at).toLocaleString() : "";
      title.appendChild(link);
      title.appendChild(document.createTextNode(" · "));
      title.appendChild(time);
      header.appendChild(avatar);
      header.appendChild(title);
      body.className = "comment-body";
      body.textContent = comment.body || "";
      article.appendChild(header);
      article.appendChild(body);
      list.appendChild(article);
    });
  }

  function loadIssueComments(root, isMainland) {
    var owner = root.getAttribute("data-comments-owner") || "";
    var repo = root.getAttribute("data-comments-repo") || "";
    var label = root.getAttribute("data-comments-label") || "";
    var key = root.getAttribute("data-comments-key") || "";
    var createUrl = root.getAttribute("data-comments-create-url") || "";
    var emptyText = root.getAttribute("data-comments-empty") || "";
    var errorText = root.getAttribute("data-comments-error") || "";
    var readonlyText = root.getAttribute("data-comments-readonly") || "";
    var openText = root.getAttribute("data-comments-open") || "";
    var createText = root.getAttribute("data-comments-create") || "";
    var missingText = root.getAttribute("data-comments-missing") || "";

    var query = [
      "repo:" + owner + "/" + repo,
      "is:issue",
      "label:" + label,
      '"blog-comment:' + key + '"',
      "in:body"
    ].join(" ");
    var searchUrl = "https://api.github.com/search/issues?q=" + encodeURIComponent(query) + "&per_page=1";

    fetch(searchUrl, {
      headers: { Accept: "application/vnd.github+json" },
      credentials: "omit"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("issue search failed");
        return response.json();
      })
      .then(function (data) {
        var issue = data && Array.isArray(data.items) ? data.items[0] : null;
        if (!issue) {
          setCommentStatus(root, isMainland ? readonlyText + " " + missingText : missingText, false);
          setCommentAction(root, isMainland ? "" : createUrl, isMainland ? "" : createText);
          return [];
        }

        setCommentAction(root, isMainland ? "" : issue.html_url, isMainland ? "" : openText);
        if (isMainland) {
          var note = root.querySelector(".comments-note");
          if (note) note.textContent = readonlyText;
        }

        return fetch(issue.comments_url + "?per_page=50", {
          headers: { Accept: "application/vnd.github+json" },
          credentials: "omit"
        })
          .then(function (response) {
            if (!response.ok) throw new Error("comments failed");
            return response.json();
          });
      })
      .then(function (comments) {
        if (!Array.isArray(comments)) return;
        renderComments(root, comments);
        setCommentStatus(root, comments.length ? "" : emptyText, false);
      })
      .catch(function () {
        setCommentStatus(root, errorText, true);
      });
  }

  setupSearch();
  setupImageLightbox();
  setupRegionMedia();
  setupArticleAudioTracks();
  setupArticleCaptionTracks();
  setupIssueComments();
})();
