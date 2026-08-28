importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCQh1_1XSMV4hKL_tqdnEpOCzpGYDzn23k",
  authDomain: "hazard-report-cps.firebaseapp.com",
  projectId: "hazard-report-cps",
  storageBucket: "hazard-report-cps.firebasestorage.app",
  messagingSenderId: "223518896628",
  appId: "1:223518896628:web:b29696cb20b4c14f8d49a1",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Hazard Report";
  const body = (payload.notification && payload.notification.body) || "";
  self.registration.showNotification(title, { body, icon: "./icons/icon-192.png", badge: "./icons/icon-192.png", data: payload.data || {} });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow("./index.html");
  }));
});

const CACHE_NAME = "hazard-report-shell-v5";
const SHELL_FILES = ["./index.html", "./bundle.js", "./styles.css", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
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
