// Test ve çekim için UYDURMA PDF'ler üretir (Örnek Tekstil, VKN 4820193576). Gerçek mükellef belgesi kullanılmaz.
// Belgelerin HTML'i maketten alınır, Chrome'un "PDF olarak yazdır"ı ile yazısı seçilebilir gerçek PDF'e çevrilir.
// Kullanım: CHR=<Chrome for Testing> PW=<playwright-core> node test/fikstur.js
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW);
// Belge şablonları tasarım maketinden okunur (maket bu depoda değil). Üretilmiş belgeler test/ornek/ altında hazır.
const MAKET = process.env.MAKET;
if (!MAKET) { console.error('MAKET ortam değişkenine maket.html yolunu verin.'); process.exit(1); }
const CIKTI = path.join(__dirname, 'ornek', 'Ornek_Tekstil_2026-10');
const DOSYALAR = [
  ['Ekim_2026_KDV_Paketi.pdf', [['beyan1'], ['beyan2'], ['tahakkuk'], ['dekont'], ['blank'], ['fatura', 184], ['fatura', 185], ['mizan']]],
  ['KDV_Beyannamesi_Ekim2026.pdf', [['beyan1'], ['beyan2']]],
  ['Tahakkuk_Fisi_10-2026.pdf', [['tahakkuk']]],
  ['Odeme_Dekontu_25112026.pdf', [['dekont']]],
  ['Satis_Faturalari_Ekim.pdf', [['fatura', 186], ['fatura', 187], ['fatura', 188], ['fatura', 189], ['fatura', 190]]],
  ['Gecici_Mizan_Ekim2026.pdf', [['mizan']]],
  ['Fatura_ORN2026000191.pdf', [['fatura', 191]]],
  ['Fatura_ORN2026000192.pdf', [['fatura', 192]]],
  ['Fatura_ORN2026000193.pdf', [['fatura', 193]]],
];
const TEMEL = '.doc{position:relative;width:595px;height:842px;box-sizing:border-box;overflow:hidden;color:#1e293b;font:9.5px/1.45 "Helvetica Neue",Arial,sans-serif;padding:42px 44px}';

(async () => {
  fs.rmSync(CIKTI, { recursive: true, force: true });
  fs.mkdirSync(CIKTI, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHR });
  const m = await b.newPage();
  await m.goto('file://' + MAKET);
  const css = await m.evaluate(() => [...document.styleSheets[0].cssRules].map((r) => r.cssText).filter((t) => t.startsWith('.doc')).join('\n'));
  const p = await b.newPage();
  for (const [ad, sayfalar] of DOSYALAR) {
    const govde = [];
    for (const [t, a] of sayfalar) govde.push(`<div class="doc d-${t}">${await m.evaluate(([t, a]) => DOCS[t](a), [t, a])}</div>`);
    await p.setContent(`<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:0}body{margin:0}${TEMEL}.doc{zoom:1.3333;page-break-after:always}${css}</style>${govde.join('')}`);
    await p.pdf({ path: path.join(CIKTI, ad), format: 'A4', printBackground: true });
  }
  // Taranmış gibi: yalnızca resimden oluşan sayfa (yazı katmanı yok)
  await p.setViewportSize({ width: 800, height: 1200 });
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0}${TEMEL}.doc{background:#fbfaf6}${css}</style><div class="doc d-fatura">${await m.evaluate(() => DOCS.fatura(194))}</div>`);
  const jpg = await p.locator('.doc').screenshot({ type: 'jpeg', quality: 70, scale: 'device' });
  await p.setContent(`<!doctype html><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block;transform:rotate(.4deg)}</style><img src="data:image/jpeg;base64,${jpg.toString('base64')}">`);
  await p.pdf({ path: path.join(CIKTI, 'Taranmis_Fatura_ORN2026000194.pdf'), format: 'A4', printBackground: true });
  // Bağlantılı belge: dış bağlantı (örnek adres) + belge içinde 2. sayfaya giden bağlantı
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:0}body{margin:0;font:15px/1.6 Arial,sans-serif;color:#1e293b}section{height:297mm;box-sizing:border-box;padding:28mm 24mm;page-break-after:always}h1{font-size:24px;color:#0b1f36}a{color:#1d4ed8}</style>
    <section><h1>Kapanış Dosyası — İçindekiler</h1><p><a href="#bolum2">2. Bölüm: Tahakkuk ve ödeme özeti</a></p><p>Mevzuat bağlantısı: <a href="https://example.com/mevzuat">example.com/mevzuat</a></p><p>Bu belge test için uydurulmuştur.</p></section>
    <section id="bolum2"><h1>2. Bölüm: Tahakkuk ve ödeme özeti</h1><p>Ödenmesi gereken KDV 72.715,85 TL; damga vergisi 571,00 TL.</p></section>`);
  await p.pdf({ path: path.join(CIKTI, 'Baglantili_Kapanis_Dosyasi.pdf'), format: 'A4', printBackground: true });
  // İki yana yaslı, Times yazı tipinde açıklama notu (arama vurgusunun harfe oturmasını denemek için)
  const PARAGRAF = [
    'KDV’nin konusuna giren işlemler, 3065 sayılı Kanunun 1 inci maddesinde sayılmış olup, mal teslimi veya hizmet ifalarının verginin konusuna girebilmesi için, Türkiye’de ticari, sınai, zirai faaliyet ve serbest meslek faaliyeti çerçevesinde yapılmış olmaları veya aynı maddede belirtildiği üzere, “diğer” faaliyetler kapsamında yapılmaları gerekir. İthalatta ise prensip olarak her türlü mal ve hizmet ithali vergiye tabidir.',
    'Örnek Tekstil Sanayi ve Ticaret Anonim Şirketi tarafından düzenlenen faturalarda, teslim tarihi ile fatura tarihi arasındaki süre yedi günü geçmemelidir. Aksi hâlde fatura hiç düzenlenmemiş sayılır ve vergi usul hükümleri uygulanır; bu durumda özel usulsüzlük cezası kesilmesi söz konusu olabilir.',
    'Ödenmesi gereken KDV tutarı 72.715,85 TL olup, beyanname ile birlikte tahakkuk eden damga vergisi 571,00 TL’dir. Ödemeler, vade tarihi olan 26.11.2026 gününe kadar anlaşmalı bankalar ya da internet vergi dairesi aracılığıyla yapılabilir.',
  ];
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:0}body{margin:0}section{box-sizing:border-box;padding:24mm 22mm;font:12pt/1.5 "Times New Roman",Times,serif;color:#111;text-align:justify}h1{font:bold 14pt "Times New Roman",serif;text-align:center;margin:0 0 12pt}p{text-indent:12mm;margin:0 0 8pt}</style><section><h1>AÇIKLAMA NOTU</h1>${PARAGRAF.map((x) => `<p>${x}</p>`).join('')}</section>`);
  await p.pdf({ path: path.join(CIKTI, 'Aciklama_Notu_KDV.pdf'), format: 'A4', printBackground: true });
  fs.writeFileSync(path.join(CIKTI, 'okubeni.txt'), 'Bu klasördeki belgeler test için uydurulmuştur.\n');
  await b.close();
  console.log(fs.readdirSync(CIKTI).join('\n'));
})();
