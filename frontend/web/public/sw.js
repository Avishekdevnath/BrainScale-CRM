/**
 * Service Worker for Web Push Notifications
 * Handles push notification events and displays notifications
 */

const CACHE_NAME = 'team-chat-v1';
const urlsToCache = [
  '/',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(() => {
          // Silently ignore cache errors
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification event - received from server
self.addEventListener('push', (event) => {
  let notificationData = {};

  // Parse notification data from push event
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'New Notification',
        body: event.data.text(),
      };
    }
  }

  const options = {
    body: notificationData.body || 'New message',
    icon: notificationData.icon || '/bs-icon.png',
    badge: notificationData.badge || '/bs-badge.png',
    tag: notificationData.tag || 'team-chat-notification',
    requireInteraction: notificationData.requireInteraction || false,
    data: {
      url: notificationData.url || '/app/team-chat',
      channelId: notificationData.channelId,
      messageId: notificationData.messageId,
      userId: notificationData.userId,
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  const title = notificationData.title || 'BrainScale';

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - user clicked on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;

  if (event.action === 'close') {
    return;
  }

  // Open the app at the appropriate URL
  const urlToOpen = data.url || '/app/team-chat';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if the app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open the app in a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data;
  // Could send an analytics event here to track notification dismissals
});

// Fetch event - for offline support (optional)
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // Return offline page if needed
        return new Response('Offline');
      })
  );
});

// Message event - for communication with clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});
