// Push notification ditangani langsung lewat standar Web Push API (tanpa bergantung
// pada file eksternal apa pun) — lebih andal dibanding memuat SDK Firebase lewat importScripts.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = (data.notification && data.notification.title) || "Hazard Report";
  const body = (data.notification && data.notification.body) || "";
  event.waitUntil(
    self.registration.showNotification(title, { body, icon: "./logo.png", badge: "./logo.png", data: data.data || {} })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow("./index.html");
  }));
});

const CACHE_NAME = "hazard-report-shell-v8";
const SHELL_FILES = ["./index.html", "./bundle.js", "./styles.css", "./manifest.json", "./logo.png"];

self.addEventListener("install", (event) => {
  // cache.add per file (bukan addAll) supaya 1 file yang gagal/belum ada (mis. logo.png
  // belum sempat di-upload) tidak membuat seluruh instalasi service worker gagal.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(SHELL_FILES.map((f) => cache.add(f).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first untuk file app-shell (HTML/JS/CSS/icon). Request lain (mis. ke Firebase)
// diteruskan langsung ke network — Firestore SDK sendiri yang menangani offline-nya.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace("./", "/")));
  if (event.request.method !== "GET" || !isShellFile) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return resp;
      });
    })
  );
});
