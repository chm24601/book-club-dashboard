const CACHE = 'bookclub-v2';
const STATIC_ASSETS = [
  '/manifest.json', '/icon.svg', '/icon-maskable.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always fetch API calls fresh
  if (url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for HTML and JS (so code changes always get through)
  if (url.endsWith('.html') || url.endsWith('.js') || url.endsWith('.css')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for icons / manifest
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
