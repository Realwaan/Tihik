const sw = `const STATIC_CACHE = "trackit-static-v3";
const PRECACHE_URLS = ["/", "/signin", "/signup"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) {
    return;
  }

   // Never cache Next.js build assets. Serving stale chunks causes hydration mismatches.
  if (url.pathname.startsWith("/_next/") || url.pathname === "/sw.js") {
    return;
  }

  // Keep app navigations network-first so auth redirects and fresh HTML are never stale.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/") || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic" ||
            !url.origin.startsWith(self.location.origin)
          ) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match("/") || Response.error());
    })
  );
});`;

export async function GET() {
  return new Response(sw, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
