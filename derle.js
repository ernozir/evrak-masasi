#!/usr/bin/env node
// Evrak Masası — derleyici: src/ altındaki parçaları ve lib/ kütüphanelerini tek bir HTML dosyasında birleştirir.
// Çıktı: dist/Evrak-Masasi.html (kullanıcıya verilen tek dosya; çift tıklayınca açılır, internet gerekmez).
// Kullanım: node derle.js
'use strict';
const fs = require('fs');
const path = require('path');

const kok = __dirname;
const oku = (p) => fs.readFileSync(path.join(kok, p), 'utf8');

const BETIKLER = ['ikon.js', 'yardimci.js', 'zipwrite.js', 'xlsxwrite.js', 'motor.js', 'yazikatmani.js', 'belgeler.js', 'isaret.js', 'goruntule.js', 'kurulum.js', 'uygulama.js'];
const STILLER = ['stil.css', 'metin-katmani.css', 'ek.css'];

// </script> dizisi HTML'i erken kapatmasın
const guvenliBetik = (s) => s.replace(/<\/script/gi, '<\\/script');
const jsDize = (s) => JSON.stringify(s).replace(/<\//g, '<\\/').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

const pdfjs = oku('lib/pdf.min.mjs');
// İşçi klasik betik olarak çalışacak: sondaki "export{…}" satırı atılır (motor.js'teki açıklamaya bakın)
const isciHam = oku('lib/pdf.worker.min.mjs');
const isci = isciHam.replace(/export\s*\{[^}]*\};?\s*$/, '');
if (isci === isciHam) throw new Error('pdf.worker içinde beklenen export satırı bulunamadı');
const pdfLib = oku('lib/pdf-lib.min.js');

let html = oku('src/index.html');
const stil = STILLER.map((f) => `/* ==== ${f} ==== */\n` + oku('src/' + f)).join('\n');
const kutuphane = [
  '<!-- pdf-lib 1.17.1 (MIT) -->',
  `<script>${guvenliBetik(pdfLib)}</script>`,
  '<!-- pdf.js 4.10.38 (Apache-2.0): motor.js bu dizeleri Blob olarak yükler -->',
  `<script>window.PDFJS_KAYNAK=${jsDize(pdfjs)};window.PDFJS_ISCI=${jsDize(isci)};</script>`,
].join('\n');
const betik = BETIKLER.map((f) => `<script>/* ==== ${f} ==== */\n${guvenliBetik(oku('src/js/' + f))}</script>`).join('\n');

html = html.replace('<!--STIL-->', () => `<style>\n${stil}\n</style>`)
  .replace('<!--KUTUPHANE-->', () => kutuphane)
  .replace('<!--BETIK-->', () => betik);

// Sekme simgesi: SVG dosyanın içine gömülür
const ikonSvg = oku('src/pwa/ikon.svg').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
const simge = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(ikonSvg)}">`;

// 1) Tek dosya: indirilip çift tıklanarak açılır
fs.mkdirSync(path.join(kok, 'dist'), { recursive: true });
const tekDosya = html.replace('<!--BASLIK_EK-->', () => simge);
fs.writeFileSync(path.join(kok, 'dist', 'Evrak-Masasi.html'), tekDosya);
console.log(`dist/Evrak-Masasi.html · ${(tekDosya.length / 1048576).toFixed(2)} MB`);

// 2) GitHub Pages (docs/): aynı program + uygulama bilgileri, simgeler ve çevrimdışı betik → "Yükle"
const site = path.join(kok, 'docs');
fs.mkdirSync(site, { recursive: true });
const sayfa = html.replace('<!--BASLIK_EK-->', () => [simge,
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">'].join('\n'));
fs.writeFileSync(path.join(site, 'index.html'), sayfa);
const surum = require('crypto').createHash('sha1').update(sayfa).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(site, 'sw.js'), oku('src/pwa/sw.js').replace('__SURUM__', surum));
for (const f of ['manifest.webmanifest', 'ikon-192.png', 'ikon-512.png', 'ikon-maskable-512.png', 'apple-touch-icon.png']) {
  fs.copyFileSync(path.join(kok, 'src', 'pwa', f), path.join(site, f));
}
fs.writeFileSync(path.join(site, '.nojekyll'), '');
console.log(`docs/ (GitHub Pages) · sürüm ${surum}`);
