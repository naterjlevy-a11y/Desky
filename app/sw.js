// Service worker: makes the app open instantly and work with no signal.
//
// Strategy is deliberately split:
//   - The app shell is cached and served cache-first, so opening the app in a
//     basement with no bars still gets you a working capture box immediately.
//   - Supabase requests are never cached. Stale captures would be worse than
//     none, and writes must reach the network or fail loudly so the queue in
//     localStorage keeps holding them.

const CACHE = "desky-v8-0";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/config.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never touch the network layer for Supabase — let the app handle failure.
  if (url.hostname.endsWith(".supabase.co")) return;
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) {
        // Serve immediately, then quietly refresh for next time.
        e.waitUntil(
          fetch(e.request)
            .then((res) => res.ok && caches.open(CACHE).then((c) => c.put(e.request, res.clone())))
            .catch(() => {})
        );
        return hit;
      }
      return fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, copy)));
          }
          return res;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
