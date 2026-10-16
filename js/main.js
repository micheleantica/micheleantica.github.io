(function () {
  var T = window.TRANSLATIONS;
  var DEFAULT = "en";
  var STORE_KEY = "lang";

  // GoatCounter site code (the "xxx" in https://xxx.goatcounter.com). Empty = analytics off.
  var GOATCOUNTER = "mike7h";

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

    // "2026-03" → "Mar 2026" / "mar 2026", in the page language.
    var fmt = new Intl.DateTimeFormat(lang, { month: "short", year: "numeric", timeZone: "UTC" });
    document.querySelectorAll("[data-date]").forEach(function (el) {
      var parts = el.dataset.date.split("-");
      el.textContent = fmt.format(Date.UTC(+parts[0], +parts[1] - 1, 1));
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

  // ----- Toolbar -------------------------------------------------------
  var toolbar = document.getElementById("toolbar");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a[data-section]"));
  var pill = document.querySelector(".nav-pill");
  var activeLink = null;

  // Slide the highlight under the link of the section being read.
  function movePill() {
    if (!activeLink || !activeLink.offsetWidth) { pill.style.opacity = 0; return; }
    pill.style.width = activeLink.offsetWidth + "px";
    pill.style.transform = "translateX(" + activeLink.offsetLeft + "px)";
    pill.style.opacity = 1;
  }
  function setActive(id) {
    var link = null;
    navLinks.forEach(function (a) {
      var on = a.dataset.section === id;
      a.classList.toggle("active", on);
      if (on) { link = a; a.setAttribute("aria-current", "true"); } else a.removeAttribute("aria-current");
    });
    activeLink = link;
    movePill();
  }

  // Wide and transparent at the very top; floating pill + reading progress once scrolled.
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    toolbar.classList.toggle("scrolled", y > 24);
    var max = document.documentElement.scrollHeight - innerHeight;
    toolbar.style.setProperty("--progress", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);

    // Active section = the last one whose top has passed the upper third of the screen.
    var current = null;
    navLinks.forEach(function (a) {
      var s = document.getElementById(a.dataset.section);
      if (s && s.getBoundingClientRect().top < innerHeight * 0.35) current = a.dataset.section;
    });
    if (innerHeight + y >= document.documentElement.scrollHeight - 4) current = "contact";
    if (!activeLink || activeLink.dataset.section !== current) setActive(current);
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", movePill);
  onScroll();

  // Phone menu
  var menuToggle = document.getElementById("menuToggle");
  function setMenu(open) {
    toolbar.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", open);
  }
  menuToggle.addEventListener("click", function () { setMenu(!toolbar.classList.contains("open")); });
  document.querySelectorAll(".menu-panel a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  document.addEventListener("click", function (e) {
    if (toolbar.classList.contains("open") && !toolbar.contains(e.target)) setMenu(false);
  });

  // Light / night theme. Light is the default; the choice is remembered.
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  function isDark() { return root.dataset.theme === "dark"; }
  function labelTheme() {
    var dict = T[root.lang] || T[DEFAULT];
    themeToggle.setAttribute("aria-label", dict[isDark() ? "theme.toLight" : "theme.toDark"]);
    themeToggle.setAttribute("aria-pressed", isDark());
    if (metaTheme) metaTheme.content = isDark() ? "#0f1114" : "#fdfdfd";
  }
  function applyTheme(dark) {
    if (dark) root.dataset.theme = "dark"; else delete root.dataset.theme;
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
    labelTheme();
  }
  themeToggle.addEventListener("click", function () {
    var dark = !isDark();
    track("theme: " + (dark ? "dark" : "light"));
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduce) {
      // The new theme grows in a circle from the toggle button.
      var r = themeToggle.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.startViewTransition(function () { applyTheme(dark); }).ready.then(function () {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
          { duration: 650, easing: "cubic-bezier(.16, 1, .3, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(function () {}); // skipped (e.g. background tab): the theme still switches
    } else {
      root.classList.add("theme-fade");
      applyTheme(dark);
      setTimeout(function () { root.classList.remove("theme-fade"); }, 500);
    }
  });

  // Language changes the link widths, so re-measure the highlight and re-label the toggle.
  var baseSetLang = setLang;
  setLang = function (lang) { baseSetLang(lang); labelTheme(); requestAnimationFrame(movePill); };
  document.fonts && document.fonts.ready.then(movePill);

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
