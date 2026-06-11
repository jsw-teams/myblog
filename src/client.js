(function () {
  var supported = ["zh-CN", "zh-TW", "en"];
  var storageKey = "blog.js.gripe.locale";
  var basePath = String(window.JSGripeBasePath || "").replace(/\/$/, "");

  function withBase(path) {
    if (!basePath || path.indexOf("/") !== 0 || path.indexOf(basePath + "/") === 0) return path;
    return basePath + path;
  }

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
  setupWebMcp();

  if (document.body && document.body.getAttribute("data-root-language-picker") === "true") {
    var target = withBase("/" + preferred + "/");
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

  function normalizeCountry(value) {
    return String(value || "").trim().toUpperCase();
  }

  var regionPromise = null;

  function detectMainlandChina() {
    if (regionPromise) return regionPromise;
    regionPromise = new Promise(function (resolve) {
      var forced = new URLSearchParams(window.location.search).get("region");
      if (forced) {
        resolve(normalizeCountry(forced) === "CN");
        return;
      }

      resolve(readInjectedCountry() === "CN");
    });
    return regionPromise;
  }

  function readInjectedCountry() {
    var htmlCountry = document.documentElement.getAttribute("data-region-country");
    var bodyCountry = document.body ? document.body.getAttribute("data-region-country") : "";
    var meta = document.querySelector('meta[name="visitor-country"]');
    var metaCountry = meta ? meta.getAttribute("content") : "";
    var scriptCountry = window.JSGripeRegion && window.JSGripeRegion.country;
    return normalizeCountry(htmlCountry || bodyCountry || metaCountry || scriptCountry);
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
      '<h3><a href="' + escapeHtml(withBase(entry.url)) + '">' + escapeHtml(entry.title) + "</a></h3>" +
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

    fetch(withBase("/assets/search-index." + encodeURIComponent(locale) + ".json"), { credentials: "same-origin" })
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

  function setupUtterancesComments() {
    var roots = Array.prototype.slice.call(document.querySelectorAll("[data-utterances-root]"));
    if (!roots.length) return;

    detectMainlandChina().then(function (isMainland) {
      roots.forEach(function (root) {
        var status = root.querySelector("[data-comments-status]");
        var mount = root.querySelector("[data-utterances-mount]");
        if (!mount) return;

        if (isMainland) {
          loadMirroredComments(root);
          return;
        }

        if (status) status.textContent = "";
        if (mount.querySelector("script")) return;

        var script = document.createElement("script");
        script.src = "https://utteranc.es/client.js";
        script.async = true;
        script.crossOrigin = "anonymous";
        script.setAttribute("repo", root.getAttribute("data-utterances-repo") || "");
        script.setAttribute("issue-term", root.getAttribute("data-utterances-issue-term") || "title");
        script.setAttribute("label", root.getAttribute("data-utterances-label") || "");
        script.setAttribute("theme", root.getAttribute("data-utterances-theme") || "github-light");
        mount.appendChild(script);
      });
    });
  }

  function setupWebMcp() {
    function searchPublicPosts(input) {
      var query = String(input && input.query || "").trim();
      var locale = supported.indexOf(input && input.locale) >= 0 ? input.locale : preferredLocale();
      if (!query) return Promise.resolve({ locale: locale, results: [] });

      var tokens = normalizeText(query).split(" ").filter(Boolean);
      return fetch(withBase("/assets/search-index." + encodeURIComponent(locale) + ".json"), { credentials: "same-origin" })
        .then(function (response) {
          if (!response.ok) throw new Error("Search index request failed");
          return response.json();
        })
        .then(function (data) {
          var limit = Math.max(1, Math.min(Number(input && input.limit) || 10, 30));
          var results = (Array.isArray(data) ? data : [])
            .map(function (entry) {
              return { entry: entry, score: scoreEntry(entry, tokens) };
            })
            .filter(function (item) {
              return item.score > 0;
            })
            .sort(function (a, b) {
              return b.score - a.score || String(b.entry.date).localeCompare(String(a.entry.date));
            })
            .slice(0, limit)
            .map(function (item) {
              return {
                title: item.entry.title,
                description: item.entry.description,
                url: new URL(withBase(item.entry.url), window.location.origin).href,
                date: item.entry.date,
                category: item.entry.category,
                tags: item.entry.tags || []
              };
            });
          return { locale: locale, query: query, results: results };
        });
    }

    var tools = [
      {
        name: "search_public_posts",
        title: "Search public posts",
        description: "Search public blog posts by keyword and return matching article URLs.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 1 },
            locale: { type: "string", enum: supported },
            limit: { type: "integer", minimum: 1, maximum: 30, default: 10 }
          },
          required: ["query"]
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: searchPublicPosts
      },
      {
        name: "list_discovery_resources",
        title: "List discovery resources",
        description: "List machine-readable discovery resources published by this site.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        annotations: { readOnlyHint: true },
        execute: function () {
          return Promise.resolve({
            resources: [
              "/.well-known/api-catalog",
              "/.well-known/agent-skills/index.json",
              "/.well-known/mcp/server-card.json",
              "/.well-known/oauth-protected-resource",
              "/auth.md",
              "/llms.txt",
              "/llms-full.txt"
            ].map(function (path) {
              return new URL(path, window.location.origin).href;
            })
          });
        }
      }
    ];
    var registered = false;

    try {
      if (document.modelContext && typeof document.modelContext.registerTool === "function") {
        tools.forEach(function (tool) {
          document.modelContext.registerTool(tool);
        });
        registered = true;
      }
    } catch (error) {
      registered = false;
    }

    try {
      if (navigator.modelContext && typeof navigator.modelContext.provideContext === "function") {
        navigator.modelContext.provideContext({
        name: "blog-js-gripe",
        description: "Public blog discovery and search tools for blog.js.gripe.",
          tools: tools
        });
        registered = true;
      }
    } catch (error) {
      registered = false;
    }

    window.JSGripeWebMcpReady = registered;
  }

  function loadMirroredComments(root) {
    var status = root.querySelector("[data-comments-status]");
    var repo = root.getAttribute("data-utterances-repo") || "";
    var label = root.getAttribute("data-utterances-label") || "";
    var issueTerm = root.getAttribute("data-utterances-issue-term") || "";
    var readonlyText = root.getAttribute("data-comments-readonly") || "";
    var loadingText = root.getAttribute("data-comments-loading") || "";
    var emptyText = root.getAttribute("data-comments-empty") || "";
    var errorText = root.getAttribute("data-comments-error") || "";

    if (status) status.textContent = loadingText;
    var query = [
      "repo:" + repo,
      "is:issue",
      "label:" + label,
      '"' + issueTerm + '"',
      "in:title"
    ].join(" ");
    var searchUrl = "/api/comments/search?q=" + encodeURIComponent(query) + "&per_page=1";

    fetch(searchUrl, {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("comment issue search failed");
        return response.json();
      })
      .then(function (data) {
        var issue = data && Array.isArray(data.items) ? data.items[0] : null;
        if (!issue || !issue.number) return [];
        return fetch("/api/comments/issues/" + encodeURIComponent(issue.number) + "/comments?per_page=50", {
          headers: { Accept: "application/json" },
          credentials: "same-origin"
        })
          .then(function (response) {
            if (!response.ok) throw new Error("comments fetch failed");
            return response.json();
          })
          .then(function (comments) {
            return dedupeComments(comments || []);
          });
      })
      .then(function (comments) {
        if (!Array.isArray(comments)) comments = [];
        renderComments(root, comments);
        if (status) status.textContent = comments.length ? readonlyText : emptyText;
      })
      .catch(function () {
        if (status) {
          status.textContent = errorText;
          status.classList.add("is-error");
        }
      });
  }

  function dedupeComments(comments) {
    var seen = {};
    return comments.filter(function (comment) {
      var key = [
        comment.user && comment.user.login || "",
        String(comment.body || "").trim(),
        comment.created_at || ""
      ].join("\n");
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
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

  setupSearch();
  setupImageLightbox();
  setupRegionMedia();
  setupArticleAudioTracks();
  setupArticleCaptionTracks();
  setupUtterancesComments();
})();
