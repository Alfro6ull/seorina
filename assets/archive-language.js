/* Static links remain usable without JavaScript or browser storage. */
(() => {
  "use strict";
  const page = document.body.dataset.archivePage;
  if (!page) return;

  const languages = ["zh", "ko", "en"];
  const current = document.body.dataset.archiveLanguage || "zh";
  const directory = new URL(".", location.href);
  const preferenceKey = "seorina.archive.language";
  const readingKey = "seorina.archive.reading";
  const timelineKey = "seorina.archive.timeline";
  const isDocument = page === "names" || page === "research";

  function read(storageName, key) {
    try { return JSON.parse(window[storageName].getItem(key)); }
    catch { return null; }
  }
  function write(storageName, key, value) {
    try { window[storageName].setItem(key, JSON.stringify(value)); }
    catch { /* Storage may be disabled; ordinary links still work. */ }
  }
  function remove(storageName, key) {
    try { window[storageName].removeItem(key); }
    catch { /* Optional enhancement only. */ }
  }
  function documentURL(kind, language) {
    const suffix = language === "zh" ? "" : "." + language;
    return new URL(kind + suffix + ".html", directory);
  }
  function localURL(link) {
    const url = new URL(link.href, location.href);
    return url.origin === directory.origin && new URL(".", url).pathname === directory.pathname ? url : null;
  }

  // An explicit document URL always wins over an earlier preference.
  if (isDocument) write("localStorage", preferenceKey, current);
  let preferred = read("localStorage", preferenceKey);
  if (!languages.includes(preferred)) preferred = "zh";

  function updateDocumentLinks(language) {
    for (const link of document.querySelectorAll(".archive-language a[data-language]")) {
      if (link.dataset.language === language) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    for (const link of document.querySelectorAll("a[href]:not([data-language])")) {
      const url = localURL(link);
      if (!url) continue;
      const match = url.pathname.match(/\/(names|research)(?:\.(?:ko|en))?\.html$/);
      if (!match) continue;
      const target = documentURL(match[1], language);
      target.search = url.search;
      target.hash = url.hash;
      link.href = target.href;
    }
  }
  updateDocumentLinks(isDocument ? current : preferred);
  addEventListener("pageshow", () => {
    if (isDocument) write("localStorage", preferenceKey, current);
    else {
      const language = read("localStorage", preferenceKey);
      if (languages.includes(language)) updateDocumentLinks(language);
    }
  });
  addEventListener("storage", event => {
    if (page !== "timeline" || event.key !== preferenceKey) return;
    const language = read("localStorage", preferenceKey);
    if (languages.includes(language)) updateDocumentLinks(language);
  });

  function readingPosition() {
    const anchors = [...document.querySelectorAll("[data-reading-anchor], main > section[id], #archive-footer")];
    const visible = anchors.filter(element => element.getClientRects().length);
    const anchor = visible.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.top <= 80 && rect.bottom > 80;
    }).at(-1) || visible.filter(element => element.getBoundingClientRect().top <= 80).at(-1) || visible[0];
    return anchor ? { id: anchor.id, offset: anchor.getBoundingClientRect().top } : null;
  }
  function restorePosition(position) {
    const anchor = document.getElementById(position?.id);
    if (!anchor || !Number.isFinite(position.offset)) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scrollTo({ top: scrollY + anchor.getBoundingClientRect().top - position.offset, behavior: "instant" });
    }));
  }

  if (isDocument) {
    for (const link of document.querySelectorAll("[data-language-switch] a[data-language]")) {
      if (location.hash) link.hash = location.hash;
      link.addEventListener("click", event => {
        const language = link.dataset.language;
        if (!languages.includes(language)) return;
        write("localStorage", preferenceKey, language);
        if (language === current) {
          event.preventDefault();
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const position = readingPosition();
        if (!position) return;
        link.hash = position.id;
        write("sessionStorage", readingKey, { page, language, ...position });
      });
    }
    const position = read("sessionStorage", readingKey);
    if (position) remove("sessionStorage", readingKey);
    if (position?.page === page && position.language === current && location.hash === "#" + position.id) {
      restorePosition(position);
    }

    const previous = read("sessionStorage", timelineKey);
    if (previous && typeof previous.hash === "string") {
      for (const link of document.querySelectorAll("a[href]")) {
        const url = localURL(link);
        if (!url || !url.pathname.endsWith("/index.html") || url.hash) continue;
        url.hash = previous.hash;
        url.searchParams.set("resume", "1");
        link.href = url.href;
      }
    }
  }

  if (page === "timeline") {
    function rememberTimeline() {
      const visibleYear = document.querySelector(".phase:not([hidden]) > .year:not([hidden])");
      const hash = location.hash && location.hash !== "#top" ? location.hash : visibleYear ? "#" + visibleYear.id : "";
      write("sessionStorage", timelineKey, {
        hash,
        top: scrollY,
        category: document.getElementById("category-filter")?.value || ""
      });
    }
    addEventListener("pagehide", rememberTimeline);
    document.addEventListener("click", event => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const url = localURL(link);
      if (!url || !/\/(names|research)(?:\.(?:ko|en))?\.html$/.test(url.pathname)) return;
      rememberTimeline();
      if (languages.includes(link.dataset.language)) write("localStorage", preferenceKey, link.dataset.language);
    });
    const url = new URL(location.href);
    const previous = read("sessionStorage", timelineKey);
    if (url.searchParams.get("resume") === "1") {
      url.searchParams.delete("resume");
      history.replaceState(history.state, "", url);
      if (previous?.hash === location.hash && Number.isFinite(previous.top)) {
        const filter = document.getElementById("category-filter");
        if (filter && [...filter.options].some(option => option.value === previous.category)) {
          filter.value = previous.category;
          filter.dispatchEvent(new Event("change", { bubbles: true }));
        }
        requestAnimationFrame(() => requestAnimationFrame(() => scrollTo({ top: previous.top, behavior: "instant" })));
      }
    }
  }
})();
