/* Offline-Speicher: Nach dem ersten Öffnen funktioniert das Spiel ohne Internet.
   Updates kommen automatisch: Beim nächsten Start mit Internet wird die neue Fassung geholt. */
const VERSION = "sonnensystem-v25"; // gleich wie version in js/data.js
const FILES = [
  "./", "index.html", "manifest.webmanifest",
  "css/style.css", "fonts/fonts.css", "fonts/fredoka.woff2", "fonts/nunito.woff2",
  "lib/three.min.js", "lib/GLTFLoader.js", "models/astronaut.js", "models/spacekit.js", "models/naturekit.js", "models/townkit.js", "models/kenney-suburban.png", "models/kenney-roads.png",
  "js/data.js", "js/textures.js", "js/audio.js", "js/stimmen.js", "js/voice.js", "js/world.js", "js/intro.js", "js/ui.js", "js/surface.js", "js/game.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  // Echte Fotos (Galerie im Steckbrief)
  "img/erde-1.jpg", "img/erde-2.jpg", "img/erde.jpg", "img/jupiter-1.jpg", "img/jupiter-2.jpg", "img/jupiter.jpg", "img/mars-1.jpg", "img/mars-2.jpg", "img/mars.jpg", "img/merkur-1.jpg", "img/merkur.jpg", "img/mond-1.jpg", "img/mond-2.jpg", "img/mond-3.jpg", "img/mond.jpg", "img/neptun-1.jpg", "img/neptun.jpg", "img/pluto-1.jpg", "img/pluto.jpg", "img/saturn-1.jpg", "img/saturn-2.jpg", "img/saturn.jpg", "img/sonne-1.jpg", "img/sonne-2.jpg", "img/sonne.jpg", "img/uranus-1.jpg", "img/uranus.jpg", "img/venus-1.jpg", "img/venus.jpg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Sprachaufnahmen (audio/v/…) ändern sich nie – ihr Name ist ihr Inhalt. Sie kommen in einen eigenen Speicher,
// der bei neuen Versionen erhalten bleibt, und werden erst geladen, wenn sie gebraucht werden.
const VOICE_CACHE = "sonnensystem-stimmen";

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VOICE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sofort aus dem Speicher antworten und im Hintergrund die neueste Fassung holen
// (ohne Internet bleibt einfach die gespeicherte Fassung).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  if (new URL(e.request.url).pathname.includes("/audio/")) {
    e.respondWith(caches.open(VOICE_CACHE).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
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
