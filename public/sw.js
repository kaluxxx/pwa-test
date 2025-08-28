const CACHE_NAME = 'event-notifications-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || 'Nouveau participant !';
  const options = {
    body: data.body || 'Quelqu\'un a rejoint votre événement',
    icon: '/next.svg',
    badge: '/next.svg',
    tag: 'event-join',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Voir l\'événement'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

self.addEventListener('notificationclose', event => {
  console.log('Notification fermée', event);
});