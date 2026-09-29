/* Offline-Speicher: Nach dem ersten Öffnen funktioniert das Spiel ohne Internet.
   Updates kommen automatisch: Beim nächsten Start mit Internet wird die neue Fassung geholt. */
const VERSION = "sonnensystem-v3";
const FILES = [
  "./", "index.html", "manifest.webmanifest",
  "css/style.css", "fonts/fonts.css", "fonts/fredoka.woff2", "fonts/nunito.woff2",
  "lib/three.min.js",
  "js/data.js", "js/textures.js", "js/audio.js", "js/world.js", "js/ui.js", "js/game.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sofort aus dem Speicher antworten und im Hintergrund die neueste Fassung holen
// (ohne Internet bleibt einfach die gespeicherte Fassung).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) => cache.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }))
  );
});
