// Service Worker: precache static assets and handle caching strategies
const CACHE_NAME = 'emudhra-cache-v67';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/src/pages/home.html',
  '/src/pages/dashboard.html',
  '/src/pages/enterprise.html',
  '/src/pages/reports.html',
  '/src/pages/settings.html',
  '/src/pages/autoflow.html',
  '/src/pages/hld_lld.html',
  '/src/pages/testing_buddy.html',
  '/src/pages/analysis.html',
  '/src/pages/admin.html',
  '/src/styles/login.css',
  '/src/styles/dashboard.css',
  '/src/styles/home.css',
  '/src/styles/pages.css',
  '/src/styles/shared.css',
  '/src/styles/emi.css',
  '/src/styles/autoflow.css',
  '/src/app/login.js',
  '/src/app/shared.js',
  '/src/app/api-config.js',
  '/src/app/dashboard.js',
  '/src/features/home.js',
  '/src/features/settings.js',
  '/src/features/mistral_settings.js',
  '/src/features/enterprise_qa_engine.js',
  '/src/features/enterprise_dashboard.js',
  '/src/features/autoflow.js',
  '/src/features/hld_lld.js',
  '/src/features/testing_buddy.js',
  '/src/features/analysis.js',
  '/src/services/ai_engine.js',
  '/src/utils/performance_optimization.js',
  '/src/components/ui/emi.js',
  '/src/components/ui/premium-motion.js',
  '/src/styles/theme-premium.css',
  '/assets/emudhra-logo.svg',
  '/assets/emudhra-logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
      );
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
  if (url.pathname.startsWith('/relay') || url.pathname.startsWith('/api/') || url.pathname === '/health' || url.port === '11435') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Only handle same-origin GET requests here
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname === '/' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
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
