// "Uygulama olarak yükle" denemesi: docs/ klasörü yerel bir sunucudan (GitHub Pages yerine) yayınlanır.
// Kontroller: uygulama bilgileri geçerli, Chrome'a göre yüklenebilir, Yükle düğmesi çıkıyor,
// çevrimdışı betik devrede, internet kesikken program açılıp PDF görüntüleyebiliyor.
// Kullanım: CHR=<Chrome for Testing> PW=<playwright-core> node test/pwa.js
const http = require('http'), path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW);
const KOK = path.join(__dirname, '..', 'docs');
const TURLER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let gecti = 0, kaldi = 0;
const kontrol = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };

const sunucu = http.createServer((ist, yan) => {
  let yol = decodeURIComponent(new URL(ist.url, 'http://x').pathname);
  if (yol.endsWith('/')) yol += 'index.html';
  const dosya = path.join(KOK, yol);
  if (!dosya.startsWith(KOK) || !fs.existsSync(dosya)) { yan.writeHead(404); return yan.end('yok'); }
  yan.writeHead(200, { 'Content-Type': TURLER[path.extname(dosya)] || 'application/octet-stream' });
  fs.createReadStream(dosya).pipe(yan);
});

(async () => {
  await new Promise((coz) => sunucu.listen(0, '127.0.0.1', coz));
  const adres = `http://127.0.0.1:${sunucu.address().port}/`;
  // Gizli pencerede uygulama yüklenemez: geçici, normal bir tarayıcı profili kullanılır
  const profil = fs.mkdtempSync(path.join(require('os').tmpdir(), 'evrak-masasi-test-'));
  const bag = await chromium.launchPersistentContext(profil, { executablePath: process.env.CHR, viewport: { width: 1440, height: 900 } });
  const b = { close: async () => { await bag.close(); fs.rmSync(profil, { recursive: true, force: true }); } };
  const p = bag.pages()[0] || await bag.newPage();
  const hatalar = [];
  p.on('pageerror', (e) => hatalar.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });

  await p.goto(adres);
  await p.evaluate(() => Motor.hazir);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.evaluate(() => Motor.hazir);
  kontrol('Çevrimdışı betik sayfayı yönetiyor', await p.evaluate(() => !!navigator.serviceWorker.controller));

  const cdp = await bag.newCDPSession(p);
  const man = await cdp.send('Page.getAppManifest');
  kontrol('Uygulama bilgileri hatasız okundu', man.errors.length === 0 && man.data.includes('Evrak Masası'), JSON.stringify(man.errors));
  const yk = await cdp.send('Page.getInstallabilityErrors');
  kontrol('Chrome’a göre yüklenebilir', yk.installabilityErrors.length === 0, JSON.stringify(yk.installabilityErrors));
  await p.waitForTimeout(1500);
  const dugme = await p.$('[data-act="yukle"]');
  kontrol('Başlangıç’ta “Uygulama olarak yükle” düğmesi', !!dugme);
  await p.screenshot({ path: path.join(__dirname, 'ekran', '10_yukle_dugmesi.png') });

  // İnternet kesik: program önbellekten açılmalı ve PDF görüntüleyebilmeli
  await bag.setOffline(true);
  await p.reload();
  await p.evaluate(() => Motor.hazir);
  kontrol('İnternet kesikken açıldı', (await p.title()) === 'Evrak Masası');
  const [s] = await Promise.all([p.waitForEvent('filechooser'), p.click('.bigdrop [data-act="dosyaAc"]')]);
  await s.setFiles(path.join(__dirname, 'ornek', 'Ornek_Tekstil_2026-10', 'Tahakkuk_Fisi_10-2026.pdf'));
  await p.waitForSelector('.vscroll .sayfa[data-i="0"] canvas', { timeout: 15000 }).catch(() => {});
  kontrol('İnternet kesikken PDF açıldı', !!(await p.$('.vscroll .sayfa[data-i="0"] canvas')));
  await bag.setOffline(false);

  kontrol('Konsolda hata yok', hatalar.length === 0, hatalar.join(' | '));
  await b.close();
  sunucu.close();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
})().catch((e) => { console.error(e); sunucu.close(); process.exit(2); });
