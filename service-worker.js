const CACHE = "client-totals-shell-v5.7";
const RUNTIME_CACHE = "client-totals-runtime-v5.7";
const CDN_CACHE = "client-totals-cdn-v5.7";
const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"
];

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
  "./js/17-cloud-sync.js",
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

  "./icons/favicon.ico",
  "./icons/favicon-32.png",
  "./icons/icon-167.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-1024.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE_ASSETS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE && key !== RUNTIME_CACHE && key !== CDN_CACHE) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isManagedCdnAsset = CDN_ASSETS.includes(url.href);

  if (isManagedCdnAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) {
          fetch(req)
            .then(async (res) => {
              if (!res || (res.status !== 200 && res.type !== "opaque")) return;
              const cache = await caches.open(CDN_CACHE);
              cache.put(req, res.clone());
            })
            .catch(() => {});
          return cached;
        }

        try {
          const fresh = await fetch(req);
          if (fresh && (fresh.status === 200 || fresh.type === "opaque")) {
            const cache = await caches.open(CDN_CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch (error) {
          return caches.match(req);
        }
      })()
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  const isNavigation =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname === "";

  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200) {
            const cache = await caches.open(CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch (error) {
          return (
            (await caches.match(req)) ||
            (await caches.match("./")) ||
            (await caches.match("./index.html"))
          );
        }
      })()
    );
    return;
  }

  const isCodeAsset =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css");

  if (isCodeAsset) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200 && fresh.type === "basic") {
            const runtime = await caches.open(RUNTIME_CACHE);
            runtime.put(req, fresh.clone());
          }
          return fresh;
        } catch (error) {
          return caches.match(req);
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);

      if (cached) {
        fetch(req)
          .then(async (res) => {
            if (!res || res.status !== 200 || res.type !== "basic") return;
            const runtime = await caches.open(RUNTIME_CACHE);
            runtime.put(req, res.clone());
          })
          .catch(() => {});
        return cached;
      }

      try {
        const res = await fetch(req);
        if (!res || res.status !== 200 || res.type !== "basic") {
          return res;
        }
        const runtime = await caches.open(RUNTIME_CACHE);
        runtime.put(req, res.clone());
        return res;
      } catch (error) {
        return caches.match(req);
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (
    event.data.action === "skipWaiting" ||
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }
});
