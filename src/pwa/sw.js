// Evrak Masası — çevrimdışı çalışma betiği (service worker).
// Yalnızca programın kendi dosyalarını (sayfa, simgeler) önbellekte tutar. Açtığınız PDF'ler buraya
// hiç gelmez; tarayıcının içinde, bu bilgisayarda işlenir.
// Sayfa için "önce ağ": internet varken her açılışta en yeni sürüm gelir (kendiliğinden güncellenir);
// internet yoksa önbellekteki sürüm açılır.
const SURUM = '__SURUM__';
const ONBELLEK = 'evrak-masasi-' + SURUM;
const DOSYALAR = ['./', './index.html', './manifest.webmanifest', './ikon-192.png', './ikon-512.png', './ikon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a.startsWith('evrak-masasi-') && a !== ONBELLEK).map((a) => caches.delete(a))))
      .then(() => self.clients.claim()),
  );
});

function zamanAsimi(ms) { return new Promise((_, ret) => setTimeout(() => ret(new Error('zaman aşımı')), ms)); }

self.addEventListener('fetch', (e) => {
  const istek = e.request;
  if (istek.method !== 'GET' || new URL(istek.url).origin !== self.location.origin) return;
  if (istek.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const yanit = await Promise.race([fetch(istek), zamanAsimi(4000)]);
        if (yanit.ok) { const c = await caches.open(ONBELLEK); c.put('./index.html', yanit.clone()); }
        return yanit;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(istek).then((k) => k || fetch(istek)));
});
