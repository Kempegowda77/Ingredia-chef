const CACHE_NAME = "ingredia-cache-v3";
const PRECACHE_ASSETS = [
  "/favicon.svg",
  "/manifest.json"
];

// Install Event: Precache static core shell assets and activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// Activate Event: Clear all old caches & claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event Strategy:
// 1. Navigation / HTML requests: Network-First (ensures index.html always gets new JS bundle hashes)
// 2. Static Assets (/assets/*): Cache-First with Network fallback / Stale-While-Revalidate
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET & API calls
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // HTML / Navigation Requests -> Network First
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request) || caches.match("/index.html"))
    );
    return;
  }

  // Static Assets & Scripts -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        const contentType = networkResponse.headers.get("content-type") || "";
        const isHtmlResponse = contentType.includes("text/html");

        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic" && !isHtmlResponse) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
