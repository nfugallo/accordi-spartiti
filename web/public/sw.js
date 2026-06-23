const CACHE_VERSION = "strimpello-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = "strimpello-pages-v1";
const API_CACHE = `${CACHE_VERSION}-api`;

const SHELL_URLS = ["/", "/favorites", "/explore", "/offline", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, PAGE_CACHE, API_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/search/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw new Error("offline");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/song/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (url.pathname.startsWith("/song/")) {
    event.respondWith(
      networkFirst(request, PAGE_CACHE).catch(async () => {
        const offlinePage = await caches.match("/offline");
        return offlinePage ?? Response.error();
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        const offlinePage = await caches.match("/offline");
        return offlinePage ?? Response.error();
      }),
    );
  }
});
