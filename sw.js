// sw.js - Service Worker for Investidor10 Dashboard PWA
// Cache-first strategy for static assets, network-first for API/data

const CACHE_NAME = 'investidor10-dashboard-v15.0.0';
const STATIC_CACHE = 'investidor10-static-v15.0.0';
const DYNAMIC_CACHE = 'investidor10-dynamic-v15.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/index.html',
  '/script.js',
  '/real-mode.js',
  '/advanced-engine.js',
  '/rebalance-engine.js',
  '/carteira-data.js',
  '/panels.js',
  '/styles.css',
  '/manifest.json',
  '/vendor/chart.umd.min.js',
  '/vendor/chartjs-adapter-date-fns.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { credentials: 'same-origin' });
        })).catch(err => {
          console.warn('[SW] Some assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension, data: URLs
  if (url.protocol === 'chrome-extension:' || url.protocol === 'data:') return;
  
  // Strategy: Network-first para HTML/CSS/JS críticos (evita visual stale pós-deploy),
  // cache-first para assets imutáveis (vendor/fonts), network-first para API
  const path = url.pathname;
  const CRITICAL_PATHS = ['/index.html', '/', '/styles.css', '/script.js', '/panels.js', '/carteira-data.js', '/manifest.json'];
  const isCritical = CRITICAL_PATHS.includes(path);
  const isStaticAsset = STATIC_ASSETS.some(asset => event.request.url.includes(asset.replace(/^https?:\/\/[^/]+\//, '')));
  const isAPI = url.hostname === 'brapi.dev' || url.pathname.includes('/api/');
  const isCDN = url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('cdn.tailwindcss.com') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  
  if (isCritical) {
    // Network-first para críticos: usuários sempre veem a versão nova
    event.respondWith(networkFirst(event.request));
  } else if (isStaticAsset || isCDN) {
    // Cache-first for static assets and CDN
    event.respondWith(cacheFirst(event.request));
  } else if (isAPI) {
    // Network-first for API calls
    event.respondWith(networkFirst(event.request));
  } else {
    // Stale-while-revalidate for everything else
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}

// Background sync for pending uploads
self.addEventListener('sync', event => {
  if (event.tag === 'pending-uploads') {
    event.waitUntil(processPendingUploads());
  }
});

async function processPendingUploads() {
  // Process any pending uploads when back online
  console.log('[SW] Processing pending uploads');
}

// Push notifications (future)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Nova atualização na sua carteira',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: data.url || '/index.html',
    actions: [
      { action: 'open', title: 'Abrir Dashboard' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Investidor10', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/index.html')
    );
  }
});

// Periodic background sync (future)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'price-refresh') {
    event.waitUntil(refreshPrices());
  }
});

async function refreshPrices() {
  console.log('[SW] Periodic price refresh');
  // Could trigger price updates via brapi.dev
}