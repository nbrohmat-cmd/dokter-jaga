/* Service worker Dokter Jaga — cangkang aplikasi tersimpan agar terbuka instan.
   Data TIDAK disimpan di sini (data ada di localStorage aplikasi); panggilan ke Apps Script selalu langsung ke jaringan.
   Naikkan VERSI setiap kali mengunggah perubahan frontend. */
const VERSI = 'dj-1.0.0';
const CANGKANG = ['./', './index.html', './css/app.css', './js/config.js', './js/core.js', './js/ui.js', './js/xlsx.js',
  './js/pages-a.js', './js/pages-b.js', './js/pages-c.js', './js/app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
const FONT = 'dj-font-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(CANGKANG)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI && k !== FONT).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                         // POST ke API: biarkan
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;      // API & verifikasi: selalu jaringan
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // font: ambil dari cache dulu, perbarui di latar
    e.respondWith(caches.open(FONT).then(async (c) => {
      const ada = await c.match(req);
      const baru = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => ada);
      return ada || baru;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // halaman: jaringan dulu (agar versi baru cepat terasa), cadangan cache bila offline
    e.respondWith(fetch(req).then((r) => { const s = r.clone(); caches.open(VERSI).then((c) => c.put('./index.html', s)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // aset statis: cache dulu, lalu jaringan
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((ada) => ada || fetch(req).then((r) => {
    if (r.ok) { const s = r.clone(); caches.open(VERSI).then((c) => c.put(req, s)); }
    return r;
  })));
});
