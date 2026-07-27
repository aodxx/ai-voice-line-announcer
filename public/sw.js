const CACHE_NAME = "ai-voice-studio-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable.png"
];

// Install event: cache initial shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline assets");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: serve assets from cache with stale-while-revalidate
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip dynamic API calls, generation requests, and audio history files so they always hit the server
  if (
    event.request.method !== "GET" ||
    requestUrl.pathname.startsWith("/api") ||
    requestUrl.pathname.startsWith("/audio/")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve cached response immediately, then update cache in the background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore background refresh errors
          });
        return cachedResponse;
      }

      // Fetch from network and cache for next time
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse.status === 200 &&
            (requestUrl.origin === self.location.origin ||
              requestUrl.href.includes("googleapis.com") ||
              requestUrl.href.includes("gstatic.com"))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If navigation fails, fallback to cached index.html
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
