

// Names of caches
const STATIC_CACHE = "offline-news-static-v1";
const FEEDS_CACHE = "offline-news-feeds-v1";

// A simple RegExp to match “static‐looking” requests (JS, CSS, images, fonts)
const FILE_EXTENSION_REGEX = /\.(?:js|css|png|jpg|jpeg|svg|woff2?)$/;

// List of core URLs to cache during install (app shell)
const APP_SHELL_URLS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  // Depending on your Next.js build, you may want to add other static files here,
  // but Next’s fingerprinted assets (/_next/static/…) will be cached at runtime.
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_URLS);
    })
  );
  // Activate immediately once installed
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up any old caches not matching our names
  const expected = [STATIC_CACHE, FEEDS_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!expected.includes(key)) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // === 1) Handle API: /api/feeds with network‐first, fallback to cache ===
  if (url.pathname.startsWith("/api/feeds")) {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          // Clone & put in FEEDS_CACHE for later offline use
          const copy = networkRes.clone();
          caches.open(FEEDS_CACHE).then((cache) => {
            cache.put(request, copy);
          });
          return networkRes;
        })
        .catch(() => {
          // If network fails, return cached response (if any)
          return caches.match(request);
        })
    );
    return;
  }

  // === 2) Static assets (JS/CSS/images/fonts) with cache‐first strategy ===
  if (FILE_EXTENSION_REGEX.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((networkRes) => {
          // Cache the new file for next time
          const copy = networkRes.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, copy);
          });
          return networkRes;
        });
      })
    );
    return;
  }

  // === 3) Navigation requests (HTML pages) with network‐first, fallback to "/" ===
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          // Cache the HTML for offline fallback
          const copy = networkRes.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, copy);
          });
          return networkRes;
        })
        .catch(() => {
          // If offline, fallback to cached "/" (app shell)
          return caches.match("/");
        })
    );
    return;
  }

  // === 4) All other requests: network first, fallback to cache if offline ===
  event.respondWith(
    fetch(request)
      .then((networkRes) => networkRes)
      .catch(() => caches.match(request))
  );
});
