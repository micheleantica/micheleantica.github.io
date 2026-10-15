(function () {
  var T = window.TRANSLATIONS;
  var DEFAULT = "en";
  var STORE_KEY = "lang";

  // GoatCounter site code (the "xxx" in https://xxx.goatcounter.com). Empty = analytics off.
  var GOATCOUNTER = "";

  if (GOATCOUNTER) {
    var gc = document.createElement("script");
    gc.async = true;
    gc.src = "https://gc.zgo.at/count.js";
    gc.dataset.goatcounter = "https://" + GOATCOUNTER + ".goatcounter.com/count";
    document.head.appendChild(gc);
  }

  // Sends a named event; silently does nothing if GoatCounter is off or blocked.
  function track(name) {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: name, title: name, event: true });
    }
  }

  // Outbound clicks: use data-track if set, otherwise the link's site.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.getAttribute("href").charAt(0) === "#") return;
    var name = a.dataset.track ||
      (a.protocol === "mailto:" ? "email" : a.hostname.replace(/^www\./, ""));
    track("click: " + name);
  });

  function storedLang() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }

  // Priority: ?lang= in the URL, then the visitor's last choice, then English.
  function initialLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && T[fromUrl]) return fromUrl;
    var saved = storedLang();
    if (saved && T[saved]) return saved;
    return DEFAULT;
  }

  function setLang(lang) {
    var dict = T[lang];
    document.documentElement.lang = lang;
    document.title = dict["meta.title"];

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = dict[el.dataset.i18n];
      if (value !== undefined) el.innerHTML = value;
    });

    document.querySelectorAll("[data-tags]").forEach(function (el) {
      var tags = dict[el.dataset.tags] || [];
      el.innerHTML = tags.map(function (t) { return "<li>" + t + "</li>"; }).join("");
    });

    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      var on = btn.dataset.lang === lang;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on);
    });

    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}

    var url = new URL(location.href);
    if (lang === DEFAULT) url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
  }

  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(btn.dataset.lang);
      track("language: " + btn.dataset.lang);
    });
  });

  setLang(initialLang());
  document.getElementById("year").textContent = new Date().getFullYear();

  // Fade sections in as they scroll into view.
  var reveals = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("active"); });
    return;
  }

  // Record how far visitors read: one event per section, the first time it's seen.
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        track("read: " + entry.target.id);
        seen.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -50% 0px" });
  document.querySelectorAll(".sections > section[id]").forEach(function (s) { seen.observe(s); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  reveals.forEach(function (el) { io.observe(el); });
})();
