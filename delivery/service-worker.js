const CACHE = "tm-delivery-v1";
const ASSETS = ["./","./index.html","./manifest.webmanifest","./favicon.svg","./icon-192.png","./assets/framework-CXnKph_e.js","./assets/index-BIRljdrK.js","./assets/index-Rn-aUP8o.css","./assets/layout-segment-context-CU6O-8BP.js","./assets/page-DpnZcXBU.js","./assets/rolldown-runtime-S-ySWqyJ.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => { if (e.request.method !== "GET") return; e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
