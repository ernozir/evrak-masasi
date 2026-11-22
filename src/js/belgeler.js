'use strict';
// Açık belgeler: dosya/klasör açma, sürükle-bırak, belge yükleme ve küçük resimler.
// Dosyalar yalnızca bu bilgisayarda, tarayıcının belleğinde okunur; hiçbir yere gönderilmez.

const Belgeler = {
  liste: [],      // {id, ad, yol, boyut, dosya, bytes, pdf, boyutlar, kapak, kucukler, metinler, isaretler, digerNotlar, degisti, ...}
  etkin: null,
  klasor: null,   // açılan klasörün adı (şeritte gösterilir)
};
let belgeSayaci = 0;

function belgeOlustur(dosya) {
  return {
    id: ++belgeSayaci, ad: dosya.name, yol: dosya.webkitRelativePath || dosya._yol || dosya.name, boyut: dosya.size, dosya,
    bytes: null, pdf: null, sayfaSayisi: null, boyutlar: null, kapak: null, kucukler: [], metinler: [],
    isaretler: [], digerNotlar: null, degisti: false, sifreli: false, hata: null, geriAl: [], ileriAl: [], yukleniyor: null,
  };
}

const pdfMi = (f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf';

// files: File listesi. secenek.klasor: klasör adı; secenek.degistir: mevcut listeyi değiştir.
async function dosyalariEkle(files, { klasor = null, degistir = false } = {}) {
  const hepsi = [...files];
  const pdfler = hepsi.filter(pdfMi).sort((a, b) => siralayici.compare(a.webkitRelativePath || a._yol || a.name, b.webkitRelativePath || b._yol || b.name));
  if (!pdfler.length) {
    bildirim(hepsi.length ? 'Seçilenler arasında PDF dosyası yok.' : 'Dosya seçilmedi.', { tur: 'bilgi' });
    return;
  }
  if (degistir) {
    if (!(await kaydedilmemisOnay(Belgeler.liste))) return;
    Belgeler.liste.forEach(belgeBosalt);
    Belgeler.liste = [];
  }
  if (klasor) Belgeler.klasor = klasor;
  else if (degistir) Belgeler.klasor = null;
  const yeni = pdfler.map(belgeOlustur);
  Belgeler.liste.push(...yeni);
  const atlanan = hepsi.length - pdfler.length;
  if (atlanan && klasor) bildirim(`${pdfler.length} PDF açıldı · ${atlanan} PDF olmayan dosya atlandı`, { tur: 'bilgi' });
  await belgeAc(yeni[0]);
}

async function kaydedilmemisOnay(liste) {
  const kirli = liste.filter((b) => b.degisti);
  if (!kirli.length) return true;
  const r = await pencere({
    baslik: 'Kaydedilmemiş işaretler var',
    icerik: `<p>${kirli.length === 1 ? `<b>${esc(kirli[0].ad)}</b> dosyasında` : `<b>${kirli.length} dosyada</b>`} kaydedilmemiş işaret var. Devam ederseniz kaybolur.</p>`,
    dugmeler: [{ yazi: 'Vazgeç', deger: false }, { yazi: 'Kaydetmeden devam et', tehlike: true, birincil: true, deger: true }],
  });
  return !!r;
}

function belgeBosalt(b) {
  try { b.pdf?.destroy(); } catch { /* */ }
  b.pdf = null;
}

// Belgeyi pdf.js ile açar; sayfa ölçülerini ve önceki Evrak Masası işaretlerini hazırlar.
function belgeYukle(b) {
  if (b.pdf) return Promise.resolve(b.pdf);
  if (b.yukleniyor) return b.yukleniyor;
  b.yukleniyor = (async () => {
    try {
      if (!b.bytes) b.bytes = new Uint8Array(await b.dosya.arrayBuffer());
      if (!b.ayiklandi) { b.ayiklandi = true; await isaretleriAyikla(b); }
      const pdf = await Motor.ac(b.bytes, (yanlis) => sifreSor(b, yanlis));
      b.sifreli = pdf._sifreli;
      if (!b.boyutlar) {
        b.boyutlar = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const vp = (await pdf.getPage(i)).getViewport({ scale: 1 });
          b.boyutlar.push({ w: vp.width, h: vp.height });
        }
      }
      b.sayfaSayisi = pdf.numPages;
      b.pdf = pdf;
      b.hata = null;
      return pdf;
    } catch (e) {
      b.hata = e?.name === 'PasswordException' ? 'Şifre girilmedi' : 'Dosya açılamadı (bozuk ya da PDF değil)';
      console.warn(b.ad, e);
      throw e;
    } finally {
      b.yukleniyor = null;
    }
  })();
  return b.yukleniyor;
}

async function sifreSor(b, yanlis) {
  return pencere({
    baslik: 'Şifreli PDF',
    icerik: `<p><b>${esc(b.ad)}</b> şifreyle korunuyor.${yanlis ? ' <span style="color:var(--danger)">Şifre yanlış.</span>' : ''}</p>
      <div class="field"><label>Şifre</label><input class="inp" type="password" id="pdfSifre" autocomplete="off"></div>
      <p class="hint">Şifre yalnızca dosyayı bu bilgisayarda açmak için kullanılır; hiçbir yere kaydedilmez.</p>`,
    dugmeler: [{ yazi: 'Vazgeç', deger: null }, { yazi: 'Aç', birincil: true, deger: (k) => k.querySelector('#pdfSifre').value }],
    odak: '#pdfSifre',
  });
}

// Sayfayı küçük resim olarak çizer (JPEG adresi döner). genislik: CSS pikseli.
async function sayfaResmi(b, i, genislik) {
  const pdf = await belgeYukle(b);
  const sayfa = await pdf.getPage(i + 1);
  const vp1 = sayfa.getViewport({ scale: 1 });
  const vp = sayfa.getViewport({ scale: (genislik * 2) / vp1.width });
  const c = document.createElement('canvas');
  c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await sayfa.render({ canvasContext: ctx, viewport: vp }).promise;
  return c.toDataURL('image/jpeg', 0.82);
}

// Küçük resim kuyruğu: aynı anda tek iş, sırayla (arayüz donmasın).
const resimKuyrugu = { is: Promise.resolve() };
function kuyruga(fn) {
  const p = resimKuyrugu.is.then(fn, fn);
  resimKuyrugu.is = p.catch(() => {});
  return p;
}

// Şeritteki kart için ilk sayfanın resmi. Etkin olmayan belge resimden sonra bellekten bırakılır.
function kapakHazirla(b) {
  if (b.kapak || b.hata || b._kapakIstendi) return;
  b._kapakIstendi = true;
  kuyruga(async () => {
    try {
      b.kapak = await sayfaResmi(b, 0, 64);
      if (b !== Belgeler.etkin && !b.degisti) { belgeBosalt(b); if (!b.isaretler.length) b.bytes = null; }
    } catch { /* hata b.hata'da */ }
    Seritler.kartYenile(b);
  });
}

// ---- Seçiciler: dosya ve klasör pencereleri ----
function dosyaSec({ klasor = false } = {}) {
  const inp = document.createElement('input');
  inp.type = 'file';
  if (klasor) inp.webkitdirectory = true;
  else { inp.multiple = true; inp.accept = 'application/pdf,.pdf'; }
  inp.style.display = 'none';
  inp.id = klasor ? 'klasorGirdi' : 'dosyaGirdi';
  document.getElementById(inp.id)?.remove();
  document.body.appendChild(inp);
  inp.addEventListener('change', () => {
    const f = [...inp.files];
    const ad = klasor && f[0] ? (f[0].webkitRelativePath || '').split('/')[0] : null;
    dosyalariEkle(f, { klasor: ad, degistir: klasor });
    inp.remove();
  });
  inp.click();
}

// ---- Sürükle-bırak (dosya ve klasör) ----
async function girdiOku(giris, yol = '') {
  if (giris.isFile) {
    return new Promise((coz) => giris.file((f) => { f._yol = yol + f.name; coz([f]); }, () => coz([])));
  }
  if (giris.isDirectory) {
    const okuyucu = giris.createReader();
    const hepsi = [];
    for (;;) {
      const parca = await new Promise((coz) => okuyucu.readEntries(coz, () => coz([])));
      if (!parca.length) break;
      hepsi.push(...parca);
    }
    const sonuc = [];
    for (const g of hepsi) sonuc.push(...(await girdiOku(g, yol + giris.name + '/')));
    return sonuc;
  }
  return [];
}

function birakmaKur() {
  let sayac = 0;
  const kaplama = $('#birak');
  addEventListener('dragenter', (e) => { if (![...(e.dataTransfer?.types || [])].includes('Files')) return; sayac++; kaplama.classList.add('on'); });
  addEventListener('dragleave', () => { if (--sayac <= 0) { sayac = 0; kaplama.classList.remove('on'); } });
  addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
  addEventListener('drop', async (e) => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault(); sayac = 0; kaplama.classList.remove('on');
    const girisler = [...e.dataTransfer.items].map((it) => it.webkitGetAsEntry?.()).filter(Boolean);
    const klasorGiris = girisler.find((g) => g.isDirectory);
    let dosyalar = [];
    if (girisler.length) for (const g of girisler) dosyalar.push(...(await girdiOku(g)));
    else dosyalar = [...e.dataTransfer.files];
    if (klasorGiris) dosyalariEkle(dosyalar, { klasor: klasorGiris.name, degistir: true });
    else dosyalariEkle(dosyalar, { degistir: false });
  });
}
