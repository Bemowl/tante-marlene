const OLD_CACHES = ["tm-inventario-v1"];
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => OLD_CACHES.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
