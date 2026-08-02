/* College Confused service worker — network-first for pages, cache-first for assets. */
const CACHE = 'college-confused-v3';
const PRECACHE = [
  'index.html',
  'app.html',
  'blog.html',
  'cost-tool.html',
  'deadlines.html',
  'essay-tool.html',
  'privacy.html',
  'blog/_base.css',
  'blog/scholarships-hub.html',
  'blog/fafsa-hub.html',
  'blog/essay-hub.html',
  // Small and needed by the homepage cycle strip on first paint.
  // data/colleges.json (~230KB) is deliberately NOT precached — it is only
  // needed by cost-tool.html and gets cached on first use instead.
  'data/deadlines.json',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // Pages: try the network so deploys show up immediately; fall back to cache offline.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('index.html'))
        )
    );
    return;
  }

  // Data files: network-first. These carry deadlines and cost figures that must
  // never go stale — a cached-forever deadline is exactly the bug this page exists
  // to prevent. Fall back to cache only when offline.
  if (new URL(req.url).pathname.includes('/data/')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets: cache-first, populate on miss.
  e.respondWith(
    caches.match(req).then(
      (r) =>
        r ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
    )
  );
});
