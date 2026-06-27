// Service Worker: precache static assets and handle caching strategies
const CACHE_NAME = 'emudhra-cache-v53';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pages/enterprise.html',
  '/pages/reports.html',
  '/pages/settings.html',
  '/css/login.css',
  '/css/dashboard.css',
  '/css/home.css',
  '/css/pages.css',
  '/css/shared.css',
  '/js/login.js',
  '/js/mistral_settings.js',
  '/js/settings.js',
  '/js/dashboard.js',
  '/js/shared.js',
  '/js/ai_engine.js',
  '/js/enterprise_qa_engine.js',
  '/js/enterprise_dashboard.js',
  '/js/home.js',
  '/js/performance_optimization.js',
  '/assets/emudhra-logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Prefer network for API calls, fallback to cache only for explicit static assets.
  if (url.pathname.startsWith('/mistral_test') || url.port === '11435') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Only handle same-origin GET requests here
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req).then((networkResp) => {
        caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(req, networkResp.clone()); } catch (e) { /* ignore put errors */ }
        });
        return networkResp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg')) {
    event.respondWith(
      fetch(req).then((networkResp) => {
        caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(req, networkResp.clone()); } catch (e) { /* ignore put errors */ }
        });
        return networkResp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((networkResp) => {
        // Put a copy in cache for future
        caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(req, networkResp.clone()); } catch (e) { /* ignore put errors */ }
        });
        return networkResp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Listen to messages for manual cache clearing
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});
