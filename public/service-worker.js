/* Service Worker for ChimeLine PWA */

// Cache name is dynamically set based on build hash from version.json
// This ensures cache is automatically invalidated on each new build
let CACHE_NAME = "chimeline-default";

// Fetch build hash on activation to version the cache
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  // Fetch version with cache busting to ensure we get the latest
  event.waitUntil(
    fetch("/version.json?t=" + Date.now())
      .then((response) => response.json())
      .then((data) => {
        CACHE_NAME = "chimeline-" + (data.buildHash || "default");
        console.log("[Service Worker] Cache name set to:", CACHE_NAME);
        return caches.open(CACHE_NAME).then((cache) => {
          const urlsToCache = ["/", "/index.html"];
          console.log("[Service Worker] Caching app assets");
          return cache.addAll(urlsToCache);
        });
      })
      .catch((err) => {
        console.error("[Service Worker] Failed to fetch version:", err);
        // Fallback: still open cache with default name
        return caches.open(CACHE_NAME);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all pages
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request);
      })
  );
});

// Message event - handle update checks from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
