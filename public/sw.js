const CACHE_NAME = 'watchmystocks-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/portfolio',
  '/alerts',
  '/notifications',
  '/profile',
  '/settings',
  '/auth/signin',
  '/auth/signup',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip unsupported URL schemes
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('safari-extension://') ||
      event.request.url.startsWith('ms-browser-extension://')) {
    return;
  }

  // Skip data URLs and blob URLs
  if (event.request.url.startsWith('data:') || event.request.url.startsWith('blob:')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // If not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Skip caching for unsupported schemes
            if (event.request.url.startsWith('chrome-extension://') || 
                event.request.url.startsWith('moz-extension://') ||
                event.request.url.startsWith('safari-extension://') ||
                event.request.url.startsWith('ms-browser-extension://') ||
                event.request.url.startsWith('data:') ||
                event.request.url.startsWith('blob:')) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Double-check URL before caching
                if (event.request.url.startsWith('chrome-extension://') || 
                    event.request.url.startsWith('moz-extension://') ||
                    event.request.url.startsWith('safari-extension://') ||
                    event.request.url.startsWith('ms-browser-extension://') ||
                    event.request.url.startsWith('data:') ||
                    event.request.url.startsWith('blob:')) {
                  console.log('Service Worker: Skipping cache for unsupported URL:', event.request.url);
                  return;
                }
                
                cache.put(event.request, responseToCache)
                  .catch((error) => {
                    console.log('Service Worker: Failed to cache specific response:', error);
                  });
              })
              .catch((error) => {
                console.log('Service Worker: Failed to open cache:', error);
              });

            return response;
          })
          .catch((error) => {
            console.log('Service Worker: Network request failed', error);
            
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any pending offline actions
      handleBackgroundSync()
    );
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new alert notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/notifications',
        alertId: data.alertId
      },
      actions: [
        {
          action: 'view',
          title: 'View Alert',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/icon-72x72.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'WatchMyStocks Alert', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/notifications')
    );
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    // Check for pending offline actions
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      await processOfflineAction(action);
    }
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Get pending offline actions from IndexedDB
async function getPendingActions() {
  // This would integrate with IndexedDB to get pending actions
  // For now, return empty array
  return [];
}

// Process offline action
async function processOfflineAction(action) {
  try {
    // Process the action (e.g., sync alerts, update portfolio)
    console.log('Service Worker: Processing offline action', action);
  } catch (error) {
    console.error('Service Worker: Failed to process offline action', error);
  }
}
