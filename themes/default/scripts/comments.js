(function () {
  var theme = window.JSGripeTheme;
  if (!theme) return;

  Array.prototype.slice.call(document.querySelectorAll("[data-comments-root]")).forEach(function (root) {
    var status = root.querySelector("[data-comments-status]");
    var mount = root.querySelector("[data-twikoo-mount]");
    var envId = root.getAttribute("data-twikoo-env-id") || "";
    var scriptUrl = root.getAttribute("data-twikoo-script") || "";
    var loadingText = root.getAttribute("data-comments-loading") || "";
    var errorText = root.getAttribute("data-comments-error") || "";

    if (!mount || !envId || !scriptUrl) {
      if (status) status.textContent = errorText;
      return;
    }

    if (status) status.textContent = loadingText;
    theme.loadScriptOnce(scriptUrl, "twikoo-client")
      .then(function () {
        if (!window.twikoo || typeof window.twikoo.init !== "function") throw new Error("twikoo client is unavailable");
        mount.id = mount.id || "twikoo-" + Math.random().toString(36).slice(2);
        window.twikoo.init({ envId: envId, el: "#" + mount.id, path: window.location.pathname });
        if (status) status.hidden = true;
      })
      .catch(function () {
        if (mount) mount.innerHTML = "";
        if (status) {
          status.hidden = false;
          status.textContent = errorText;
          status.classList.add("is-error");
        }
      });
  });
})();
