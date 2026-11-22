'use strict';
// Uygulama olarak yükleme (program GitHub Pages'ten açıldığında).
// - Çevrimdışı çalışma betiğini (sw.js) kaydeder: yüklendikten sonra internetsiz açılır.
// - Tarayıcı "yüklenebilir" dediğinde Başlangıç ekranında "Uygulama olarak yükle" düğmesi çıkar.
// - Yüklü programla bir PDF açılınca (sağ tık → Birlikte aç → Evrak Masası) dosya doğrudan gelir.
// Çift tıklanan tek dosyada (file://) bu bölüm devre dışıdır.

const Kurulum = (() => {
  const web = location.protocol === 'https:' || location.protocol === 'http:';
  let istem = null; // tarayıcının yükleme isteği (beforeinstallprompt)
  const yuklu = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function baslat() {
    if (!web) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Çevrimdışı çalışma etkinleştirilemedi:', e));
    }
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); istem = e; Uygulama.ciz(); });
    addEventListener('appinstalled', () => { istem = null; bildirim('Evrak Masası bu bilgisayara yüklendi'); Uygulama.ciz(); });
    if ('launchQueue' in window) {
      window.launchQueue.setConsumer(async (p) => {
        if (!p.files?.length) return;
        const dosyalar = await Promise.all(p.files.map((h) => h.getFile()));
        dosyalariEkle(dosyalar, { degistir: false });
      });
    }
  }

  async function yukle() {
    if (!istem) return;
    istem.prompt();
    await istem.userChoice;
    istem = null;
    Uygulama.ciz();
  }

  return { baslat, yukle, yuklu, get web() { return web; }, get yuklenebilir() { return !!istem && !yuklu(); } };
})();
