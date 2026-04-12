const CACHE = "client-totals-shell-v4.4";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  "./css/01-base.css",
  "./css/02-layout.css",
  "./css/03-components.css",
  "./css/04-modals.css",
  "./css/05-forms.css",
  "./css/06-responsive.css",
  "./css/07-print.css",
  "./css/08-theme.css",
  "./css/09-effects.css",

  "./js/01-config.js",
  "./js/02-dom.js",
  "./js/03-state.js",
  "./js/04-storage.js",
  "./js/05-utils-core.js",
  "./js/07-modals.js",
  "./js/10-calc-dates.js",
  "./js/11-calc-status.js",
  "./js/12-calc-totals.js",
  "./js/13-calc-monthly.js",
  "./js/14-search.js",
  "./js/15-theme.js",
  "./js/16-import-export.js",
  "./js/20-actions-groups.js",
  "./js/21-actions-periods.js",
  "./js/22-actions-rows.js",
  "./js/23-actions-status.js",
  "./js/30-render-overview.js",
  "./js/31-render-periods.js",
  "./js/32-render-review.js",
  "./js/33-render-monthly.js",
  "./js/34-render-shared.js",
  "./js/35-ui-sync.js",
  "./js/40-update-flow.js",
  "./js/50-bind-events.js",
  "./js/60-app-init.js",
  "./js/99-debug.js",

  "./icons/icon-152.png",
  "./icons/icon-167.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // მხოლოდ იგივე origin
  if (url.origin !== self.location.origin) return;

  // HTML / navigation -> network first
  if (
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname === ""
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // CSS / JS / manifest / json -> network first
  if (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // სურათები და სხვა same-origin ფაილები -> cache first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

// skip waiting მხოლოდ user action-ით
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
