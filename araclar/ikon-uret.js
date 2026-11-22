// src/pwa/ikon.svg'den uygulama simgelerini üretir (PNG). Simge değişince bir kez çalıştırılır.
// Kullanım: CHR=<Chrome for Testing> PW=<playwright-core> node araclar/ikon-uret.js
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW);
const KLASOR = path.join(__dirname, '..', 'src', 'pwa');
const svg = fs.readFileSync(path.join(KLASOR, 'ikon.svg'), 'utf8');
const ICERIK = svg.replace(/<rect[^>]*\/>/, ''); // "maskable" sürüm için zemin ayrı çizilir

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHR });
  const uret = async (ad, boy, html) => {
    const p = await b.newPage({ viewport: { width: boy, height: boy } }); // her simge için temiz sayfa
    await p.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${boy}px;height:${boy}px}</style>${html}`);
    await p.screenshot({ path: path.join(KLASOR, ad), omitBackground: true });
    await p.close();
    console.log(ad);
  };
  for (const boy of [192, 512]) await uret(`ikon-${boy}.png`, boy, svg);
  await uret('apple-touch-icon.png', 180, svg.replace('rx="112"', 'rx="0"')); // iOS köşeleri kendisi yuvarlar
  // maskable: zemin tam kare, işaret güvenli alanda (ortadaki %80)
  const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="z" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="512" height="512" fill="url(#z)"/><g transform="translate(51.2 51.2) scale(.8)">${ICERIK.replace(/<svg[^>]*>|<\/svg>|<defs>[\s\S]*?<\/defs>/g, '')}</g></svg>`;
  await uret('ikon-maskable-512.png', 512, maskable);
  await b.close();
})();
