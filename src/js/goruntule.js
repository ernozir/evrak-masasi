'use strict';
// Görüntüle ekranı: sayfalar (tembel çizim), küçük resimler, arama, dosya şeridi.

const PX = 96 / 72; // %100 = gerçek boyut (1 pt = 1/72 inç)
const G = {
  sigdir: true, yuzde: 100, olcek: 1, sayfa: 0,
  kurulan: null,           // sayfa alanı hangi belge + ölçekle kuruldu
  gozlemci: null, kucukGozlemci: null, kartGozlemci: null,
  arama: { q: '', sonuclar: [], aktif: -1, suruyor: false, kaydir: false }, // etkin belgenin araması (belge.arama ile aynı nesne)
  seritAcik: depo.al('seritAcik', true), seritAra: '', seritSira: 'ad',
  sagSekme: 'notlar',
  solAcik: depo.al('solAcik', true),
  sagAcik: depo.al('sagAcik', true),
};
const bosArama = () => ({ q: '', sonuclar: [], aktif: -1, suruyor: false, kaydir: false });

function olcekHesapla(b) {
  if (G.sigdir) {
    const w = ($('#center')?.clientWidth || 900) - 56;
    const enGenis = Math.max(...b.boyutlar.map((d) => d.w));
    return Math.max(0.25, Math.min(3, w / enGenis));
  }
  return (G.yuzde / 100) * PX;
}
const yuzdeYaz = () => Math.round((G.olcek / PX) * 100);

function yakinlastir(yon) {
  const simdiki = yuzdeYaz();
  const adimlar = [25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300];
  G.yuzde = yon > 0 ? (adimlar.find((a) => a > simdiki) || 300) : ([...adimlar].reverse().find((a) => a < simdiki) || 25);
  G.sigdir = false;
  Uygulama.ciz();
}
function sigdir() { G.sigdir = true; Uygulama.ciz(); }

// ---- Ana çizim ----
function goruntuleCiz() {
  const b = Belgeler.etkin;
  Uygulama.duzen([b && G.solAcik ? '' : 'noleft', b && !G.sagAcik ? 'noright' : ''].join(' ').trim());
  if (!b?.pdf) $('#center').classList.remove('vsplit');
  const tb = $('#toolbar');
  if (!b) {
    tb.innerHTML = '<h1>Görüntüle</h1><span class="tspace"></span>';
    $('#center').innerHTML = `<div class="bos"><div class="ic">${ic('file')}</div><b>Açık belge yok</b><span>Bir PDF dosyasını ya da klasörü bu pencereye sürükleyin.</span>
      <div class="row" style="gap:8px;justify-content:center"><button class="btn primary" data-act="dosyaAc">${ic('file')}Dosya aç</button><button class="btn" data-act="klasorAc">${ic('folder')}Klasör aç</button></div></div>`;
    $('#insp').innerHTML = '';
    G.kurulan = null;
    Uygulama.durum('');
    return;
  }
  if (!b.pdf) {
    tb.innerHTML = `<h1>Görüntüle</h1><span class="tsep"></span><span class="muted">${esc(b.ad)}</span><span class="tspace"></span>`;
    $('#left').innerHTML = ''; $('#left')._imza = null;
    $('#center').innerHTML = `<div class="vscroll"><div class="bos">${b.hata ? `<div class="ic hata">${ic('alert')}</div><b>${esc(b.hata)}</b><span>${esc(b.ad)}</span>` : `<div class="spin"></div><b>Açılıyor…</b><span>${esc(b.ad)}</span>`}</div></div>${seritHTML()}`;
    Seritler.bagla();
    $('#insp').innerHTML = '';
    G.kurulan = null;
    Uygulama.durum(`<span><b>${esc(b.ad)}</b></span>`);
    if (!b.hata) belgeYukle(b).then(() => { if (b === Belgeler.etkin) { Uygulama.ciz(); Isaret.digerNotlariYukle(b); } }).catch(() => { if (b === Belgeler.etkin) Uygulama.ciz(); });
    return;
  }

  G.olcek = olcekHesapla(b);
  if (G.sayfa >= b.sayfaSayisi) G.sayfa = 0;
  aracCubugu(b);
  kucuklerCiz(b);
  const imza = b.id + '@' + G.olcek.toFixed(4);
  if (G.kurulan !== imza || !$('#center .vscroll .pages')) sayfaAlaniKur(b);
  else { Isaret.tumKatmanlariCiz(b); $('#center .pages').className = 'pages arac-' + Isaret.I.arac; }
  Seritler.guncelle();
  panelCiz();
  durumCiz(b);
  altHizala();
}

// Sağ paneldeki "Kaydet" bölümünün üst çizgisi, alttaki dosya şeridinin üst çizgisiyle aynı hizada olsun
function altHizala() {
  const s = $('#center .fstrip'), f = $('#insp .foot');
  if (!f) return;
  f.style.height = s && !s.classList.contains('closed') ? s.offsetHeight + 'px' : '';
}

function aracCubugu(b) {
  const I = Isaret.I, renk = Isaret.etkinRenk();
  const sol = `${ic('chev').replace('<svg', '<svg style="transform:rotate(90deg)"')}`, sag = `${ic('chev').replace('<svg', '<svg style="transform:rotate(-90deg)"')}`;
  $('#toolbar').innerHTML = `<button class="tb icon ${G.solAcik ? 'on' : ''}" data-act="solPanel" title="Sayfalar panelini ${G.solAcik ? 'gizle' : 'göster'}">${ic('sidebar')}</button><h1>Görüntüle</h1><span class="tsep"></span>
    <button class="tb icon" data-act="oncekiSayfa" title="Önceki sayfa (PageUp)">${sol}</button>
    <span class="sayac num"><input id="sayfaNo" value="${G.sayfa + 1}" aria-label="Sayfa"> / ${b.sayfaSayisi}</span>
    <button class="tb icon" data-act="sonrakiSayfa" title="Sonraki sayfa (PageDown)">${sag}</button>
    <span class="tsep"></span>
    <div class="atools">${Isaret.ARACLAR.map((t) => `<button class="tb ${['hl', 'not'].includes(t[0]) ? '' : 'icon'} ${I.arac === t[0] ? 'on' : ''}" data-arac="${t[0]}" title="${t[1]} (${t[3]})">${ic(t[2])}${['hl', 'not'].includes(t[0]) ? t[1] : ''}</button>`).join('')}</div>
    <span class="tsep"></span>
    <div class="acolors ${renk ? '' : 'pasif'}" title="${renk ? 'Renk' : 'Renk seçmek için bir araç ya da işaret seçin'}">${Isaret.RENKLER.map((c) => `<button class="${renk === c[0] ? 'on' : ''}" data-renk="${c[0]}" title="${c[1]}" style="--c:${c[0]}"></button>`).join('')}</div>
    <span class="tspace"></span>
    ${!G.sagAcik && b.isaretler.length ? `<button class="btn primary sm" data-act="kaydet" title="İşaretleri kaydet (Ctrl+S)">${ic('save')}Kaydet</button>` : ''}
    <button class="tb icon" data-act="gorselKaydet" title="Bu sayfayı resim olarak kaydet">${ic('image')}</button>
    <div class="zoom"><button data-act="uzaklas" title="Uzaklaştır (Ctrl −)">${ic('minus')}</button><span class="num">%${yuzdeYaz()}</span><button data-act="yakinlas" title="Yakınlaştır (Ctrl +)">${ic('plus')}</button></div>
    <button class="tb icon ${G.sigdir ? 'on' : ''}" data-act="sigdir" title="Sayfa genişliğine sığdır (Ctrl 0)">${ic('fit')}</button>
    <span class="tsep"></span><button class="tb icon ${G.sagAcik ? 'on' : ''}" data-act="sagPanel" title="Sağ paneli ${G.sagAcik ? 'gizle' : 'göster'} (notlar, arama)">${ic('sidebar').replace('<svg', '<svg style="transform:scaleX(-1)"')}</button>`;
}

function durumCiz(b) {
  const at = Isaret.ARACLAR.find((t) => t[0] === Isaret.I.arac);
  Uygulama.durum(`<span><b>${esc(b.ad)}</b></span><span>Sayfa <b class="num" id="durumSayfa">${G.sayfa + 1} / ${b.sayfaSayisi}</b></span><span class="num">${boyutYaz(b.boyut)}</span><span><b class="num">${b.isaretler.length}</b> işaret</span>${b.degisti ? '<span class="mod"><i></i>Kaydedilmemiş işaret</span>' : ''}<span class="ahint">${ic(at[2])}${at[4]}</span>`);
}

// ---- Sayfa alanı ----
function sayfaAlaniKur(b) {
  const c = $('#center');
  const eski = c.querySelector('.vscroll');
  let konum = null;
  if (eski && G.kurulan?.startsWith(b.id + '@')) { // ölçek değişti: aynı yeri göstermeye çalış
    const el = eski.querySelector(`.sayfa[data-i="${G.sayfa}"]`);
    if (el) konum = { i: G.sayfa, oran: (eski.scrollTop - el.offsetTop) / el.offsetHeight };
  }
  G.gozlemci?.disconnect();
  const s = G.olcek;
  c.classList.add('vsplit');
  c.innerHTML = `<div class="vscroll"><div class="pages arac-${Isaret.I.arac}">${b.boyutlar.map((d, i) => `<div class="sayfa" data-i="${i}" style="width:${Math.floor(d.w * s)}px;height:${Math.floor(d.h * s)}px;--scale-factor:${s}"><div class="yer"></div><div class="textLayer"></div><div class="blayer" style="width:${d.w}px;height:${d.h}px;transform:scale(${s})"></div><div class="alayer" style="width:${d.w}px;height:${d.h}px;transform:scale(${s})"></div></div>`).join('')}</div></div>${seritHTML()}`;
  G.kurulan = b.id + '@' + s.toFixed(4);
  const sc = c.querySelector('.vscroll');
  Isaret.olaylariKur(sc.querySelector('.pages'));
  Isaret.tumKatmanlariCiz(b);
  G.gozlemci = new IntersectionObserver((girisler) => {
    for (const g of girisler) if (g.isIntersecting) sayfaCiz(b, g.target);
  }, { root: sc, rootMargin: '700px 0px' });
  $$('.sayfa', sc).forEach((el) => G.gozlemci.observe(el));
  if (konum) {
    const el = sc.querySelector(`.sayfa[data-i="${konum.i}"]`);
    sc.scrollTop = el.offsetTop + konum.oran * el.offsetHeight;
  } else if (G.sayfa) sayfayaGit(G.sayfa, false);
  sc.addEventListener('scroll', () => {
    Isaret.cubukGizle();
    if (G._raf) return;
    G._raf = requestAnimationFrame(() => {
      G._raf = 0;
      const orta = sc.scrollTop + sc.clientHeight * 0.3;
      let k = 0;
      for (const el of sc.querySelectorAll('.sayfa')) { if (el.offsetTop <= orta) k = +el.dataset.i; else break; }
      if (k !== G.sayfa) { G.sayfa = k; sayfaGostergesi(); }
    });
  });
  Seritler.bagla();
}

async function sayfaCiz(b, el) {
  if (el._cizildi) return;
  el._cizildi = true;
  const i = +el.dataset.i;
  try {
    const page = await b.pdf.getPage(i + 1);
    const vp = page.getViewport({ scale: G.olcek });
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = Math.floor(vp.width * dpr); cv.height = Math.floor(vp.height * dpr);
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
    if (!el.isConnected) return;
    el.querySelector('.yer, canvas')?.replaceWith(cv);
    const tc = b.metinler[i] || (b.metinler[i] = await page.getTextContent());
    const tl = el.querySelector('.textLayer');
    tl.replaceChildren();
    const katman = new Motor.lib.TextLayer({ textContentSource: tc, container: tl, viewport: vp });
    await katman.render();
    if (window.__hizaKapali !== true) await YaziKatmani.hizala(page, tc, katman, vp);
    aramaBoya(el, i);
    await baglantilariCiz(b, page, el);
  } catch (e) {
    if (e?.name !== 'RenderingCancelledException') { console.warn('Sayfa çizilemedi', i + 1, e); el._cizildi = false; }
  }
}

// ---- Bağlantılar (PDF içindeki linkler) ----
const GUVENLI_ADRES = /^(https?:|mailto:)/i;
async function baglantilariCiz(b, page, el) {
  const L = el.querySelector('.blayer');
  if (!L) return;
  const vp1 = page.getViewport({ scale: 1 });
  const hepsi = (await page.getAnnotations()).filter((a) => a.subtype === 'Link');
  const linkler = hepsi.filter((a) => (a.url && GUVENLI_ADRES.test(a.url)) || a.dest);
  L._linkler = linkler;
  L.innerHTML = linkler.map((a, k) => {
    const r = vp1.convertToViewportRectangle(a.rect);
    const x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]), w = Math.abs(r[2] - r[0]), h = Math.abs(r[3] - r[1]);
    const dis = a.url ? `href="${esc(a.url)}" target="_blank" rel="noopener noreferrer" title="${esc(a.url)}"` : `href="#" data-ic="${k}" title="Belgede ilgili yere git"`;
    return `<a class="bag" ${dis} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></a>`;
  }).join('');
}
async function icBaglanti(a) {
  const b = Belgeler.etkin, el = a.closest('.sayfa'), L = a.closest('.blayer');
  const link = L?._linkler?.[+a.dataset.ic];
  if (!b?.pdf || !link) return;
  try {
    const hedef = typeof link.dest === 'string' ? await b.pdf.getDestination(link.dest) : link.dest;
    if (!hedef) return;
    const i = typeof hedef[0] === 'object' ? await b.pdf.getPageIndex(hedef[0]) : hedef[0];
    let y = 0;
    if (hedef[1]?.name === 'XYZ' && hedef[3] != null) {
      const vp1 = (await b.pdf.getPage(i + 1)).getViewport({ scale: 1 });
      y = Math.max(0, vp1.convertToViewportPoint(0, hedef[3])[1]);
    }
    const sc = $('.vscroll'), hedefEl = sc.querySelector(`.sayfa[data-i="${i}"]`);
    sc.scrollTo({ top: hedefEl.offsetTop + y * G.olcek - 14, behavior: 'smooth' });
    G.sayfa = i; sayfaGostergesi();
  } catch (e) { console.warn('Bağlantı hedefi bulunamadı', e); bildirim('Bağlantının hedefi bulunamadı.', { tur: 'bilgi' }); }
  void el;
}

function sayfayaGit(i, yumusak = true) {
  const sc = $('.vscroll'), el = sc?.querySelector(`.sayfa[data-i="${i}"]`);
  if (!el) return;
  sc.scrollTo({ top: el.offsetTop - 14, behavior: yumusak ? 'smooth' : 'auto' });
  G.sayfa = i;
  sayfaGostergesi();
}
function sayfaGostergesi() {
  const b = Belgeler.etkin;
  const inp = $('#sayfaNo');
  if (inp && document.activeElement !== inp) inp.value = G.sayfa + 1;
  const d = $('#durumSayfa');
  if (d) d.textContent = `${G.sayfa + 1} / ${b.sayfaSayisi}`;
  $$('#left .thumb').forEach((t) => t.classList.toggle('on', +t.dataset.goto === G.sayfa));
  const on = $(`#left .thumb[data-goto="${G.sayfa}"]`);
  if (on) { const L = $('#left'), r = on.getBoundingClientRect(), q = L.getBoundingClientRect(); if (r.top < q.top || r.bottom > q.bottom) on.scrollIntoView({ block: 'nearest' }); }
}

// ---- Küçük resimler ----
function kucuklerCiz(b) {
  const L = $('#left');
  const imza = b.id + ':' + b.sayfaSayisi;
  if (L._imza !== imza) {
    L._imza = imza;
    G.kucukGozlemci?.disconnect();
    L.innerHTML = `<div class="ph lhead"><span>Sayfalar · ${b.sayfaSayisi}</span><button class="tb icon" data-act="solPanel" title="Sayfalar panelini gizle">${ic('chev').replace('<svg', '<svg style="transform:rotate(90deg)"')}</button></div><div class="thumbs">${b.boyutlar.map((d, i) => `<button class="thumb" data-goto="${i}"><span class="kres" style="aspect-ratio:${d.w}/${d.h}">${b.kucukler[i] ? `<img src="${b.kucukler[i]}" alt="">` : ''}</span><small><span>${i + 1}</span><i class="tnb"></i></small></button>`).join('')}</div>`;
    G.kucukGozlemci = new IntersectionObserver((gs) => {
      for (const g of gs) {
        if (!g.isIntersecting) continue;
        const t = g.target, i = +t.dataset.goto;
        G.kucukGozlemci.unobserve(t);
        if (b.kucukler[i]) continue;
        kuyruga(async () => {
          if (Belgeler.etkin !== b) return;
          b.kucukler[i] = await sayfaResmi(b, i, 130);
          const k = $(`#left .thumb[data-goto="${i}"] .kres`);
          if (k && L._imza === imza) k.innerHTML = `<img src="${b.kucukler[i]}" alt="">`;
        });
      }
    }, { root: L, rootMargin: '300px 0px' });
    $$('.thumb', L).forEach((t) => { if (!b.kucukler[+t.dataset.goto]) G.kucukGozlemci.observe(t); });
  }
  const say = new Map();
  b.isaretler.forEach((a) => say.set(a.sayfa, (say.get(a.sayfa) || 0) + 1));
  $$('.thumb', L).forEach((t) => {
    const n = say.get(+t.dataset.goto) || 0, rozet = t.querySelector('.tnb');
    rozet.textContent = n || ''; rozet.title = n ? `${n} işaret` : '';
    t.classList.toggle('on', +t.dataset.goto === G.sayfa);
  });
}

// ---- Sağ panel ----
function panelCiz() {
  const b = Belgeler.etkin, P = $('#insp');
  if (!b?.pdf) { P.innerHTML = ''; return; }
  const odak = document.activeElement;
  if (odak && P.contains(odak) && odak.matches('textarea,input,select')) return; // yazarken paneli bozma
  const sekme = G.sagSekme;
  const sek = (k, ad, ik, ek = '') => `<button class="${sekme === k ? 'on' : ''}" data-sekme="${k}">${ic(ik)}${ad}${ek}</button>`;
  P.innerHTML = `<div class="itabs">${sek('notlar', 'Notlar', 'note', ` <span class="cnt num">${b.isaretler.length}</span>`)}${sek('ara', 'Ara', 'search', G.arama.sonuclar.length ? ` <span class="cnt num">${G.arama.sonuclar.length}</span>` : '')}${sek('bilgi', 'Bilgi', 'info')}</div>
    ${sekme === 'ara' ? `<div class="arabas">${araBaslik()}</div>` : ''}
    <div class="scroll">${sekme === 'notlar' ? Isaret.panelNotlar(b) : sekme === 'ara' ? `<div class="sres">${araSonuclari()}</div>` : bilgiPaneli(b)}</div>
    <div class="foot">${Isaret.panelAlt(b)}</div>`;
  altHizala();
  $('#insp .nitem.on')?.scrollIntoView({ block: 'nearest' });
}

// Arama satırı panelin üstünde sabit durur; yalnızca sonuç listesi kayar (oklara basınca düğmeler kaçmaz)
function araBaslik() {
  const A = G.arama, n = A.sonuclar.length;
  return `<div class="arasatir"><div class="arakutu">${ic('search')}<input class="inp" id="aramaKutusu" value="${esc(A.q)}" autocomplete="off" aria-label="Belgede ara"><span class="arasayi num">${n ? `${A.aktif + 1}/${n}` : ''}</span></div>
      <button class="tb icon" data-act="aramaOnceki" title="Önceki sonuç (Shift+Enter)" ${n ? '' : 'disabled'}>${ic('chev').replace('<svg', '<svg style="transform:rotate(180deg)"')}</button><button class="tb icon" data-act="aramaSonraki" title="Sonraki sonuç (Enter)" ${n ? '' : 'disabled'}>${ic('chev')}</button></div>
    <div class="hint" id="aramaDurum">${aramaDurumu()}</div>`;
}
function aramaDurumu() {
  const A = G.arama, sayfaSay = new Set(A.sonuclar.map((s) => s.sayfa)).size;
  return A.suruyor ? 'Aranıyor…' : A.q.trim().length >= 2 ? (A.sonuclar.length ? `${A.sonuclar.length}${A.sonuclar.length >= 300 ? '+' : ''} sonuç · ${sayfaSay} sayfada` : 'Sonuç yok') : 'Tutar, unvan, VKN… yazın (Ctrl F)';
}
function araSonuclari() {
  const A = G.arama;
  return A.sonuclar.slice(0, 300).map((s, k) => `<button data-sonuc="${k}" class="${k === A.aktif ? 'on' : ''}"><b>Sayfa ${s.sayfa + 1}</b> · ${s.parca}</button>`).join('');
}

function bilgiPaneli(b) {
  const ilk = b.boyutlar[0];
  const a4 = Math.abs(ilk.w - 595) < 4 && Math.abs(ilk.h - 842) < 4 ? 'A4 dikey' : Math.abs(ilk.h - 595) < 4 && Math.abs(ilk.w - 842) < 4 ? 'A4 yatay' : `${Math.round(ilk.w / 2.835)} × ${Math.round(ilk.h / 2.835)} mm`;
  const metinVar = b.metinler.length ? (b.metinler.some((t) => t?.items?.length) ? 'Seçilebilir' : 'Yok (taranmış olabilir)') : '…';
  return `<div class="sect"><h3>Belge özeti</h3><dl class="kv">
      <dt>Dosya</dt><dd class="yol" title="${esc(b.ad)}">${esc(b.ad)}</dd>
      <dt>Sayfa</dt><dd class="num">${b.sayfaSayisi}</dd><dt>Boyut</dt><dd class="num">${boyutYaz(b.boyut)}</dd><dt>Sayfa ölçüsü</dt><dd>${a4}</dd>
      <dt>Yazı katmanı</dt><dd>${metinVar}</dd><dt>Şifre</dt><dd>${b.sifreli ? 'Var' : 'Yok'}</dd>
      <dt>İşaret</dt><dd class="num">${b.isaretler.length}</dd>
      ${b.yol !== b.ad ? `<dt>Konum</dt><dd class="yol" title="${esc(b.yol)}">${esc(b.yol.split('/').slice(0, -1).join(' / ') || '—')}</dd>` : ''}</dl></div>`;
}

let aramaZamani;
function aramaGirdisi(q) {
  G.arama.q = q;
  clearTimeout(aramaZamani);
  aramaZamani = setTimeout(() => aramaYap(q), 250);
}
async function aramaYap(q) {
  const b = Belgeler.etkin;
  if (!b?.pdf) return;
  const k = trKucuk(q.trim());
  G.arama = b.arama = { ...bosArama(), q, suruyor: k.length >= 2 };
  aramaPanelYenile();
  $$('.vscroll .sayfa').forEach((el) => aramaBoya(el, +el.dataset.i));
  if (k.length < 2) return;
  const sonuclar = [];
  for (let i = 0; i < b.sayfaSayisi; i++) {
    if (G.arama.q !== q || Belgeler.etkin !== b) return;
    const tc = b.metinler[i] || (b.metinler[i] = await (await b.pdf.getPage(i + 1)).getTextContent());
    // sayfanın yazısı (dosyadaki yazılış sırasıyla) + her parçanın metindeki başlangıcı
    const baslar = [];
    let metin = '';
    for (const t of tc.items) { if (t.str === undefined) continue; baslar.push([metin.length, t]); metin += t.str + (t.hasEOL ? ' ' : ''); }
    const kk = trKucuk(metin);
    let sira = 0, pi = 0;
    for (let p = kk.indexOf(k); p >= 0 && sonuclar.length < 300; p = kk.indexOf(k, p + k.length)) {
      while (pi + 1 < baslar.length && baslar[pi + 1][0] <= p) pi++;
      const [ib, it] = baslar[pi] || [0, null];
      // ekrandaki yer: sonuçlar sayfada yukarıdan aşağı, soldan sağa sıralanacak
      const yx = it ? { y: it.transform[5], x: it.transform[4] + (it.str.length ? ((p - ib) / it.str.length) * it.width : 0), h: Math.hypot(it.transform[2], it.transform[3]) || 10 } : { y: 0, x: 0, h: 10 };
      const bas = Math.max(0, p - 30), son = Math.min(metin.length, p + k.length + 40);
      sonuclar.push({ sayfa: i, sira: sira++, ...yx, parca: (bas ? '…' : '') + esc(metin.slice(bas, p)) + '<mark>' + esc(metin.slice(p, p + k.length)) + '</mark>' + esc(metin.slice(p + k.length, son)) + (son < metin.length ? '…' : '') });
    }
  }
  if (G.arama.q !== q) return;
  // PDF'te üst bilgi, tablo gibi yerler dosyaya sayfanın sonunda yazılmış olabilir; oklar ekranda
  // zıplamasın diye sonuçlar sayfadaki görünür sıraya dizilir (sira: sayfadaki boyama için dosya sırası kalır)
  sonuclar.sort((a, b) => a.sayfa - b.sayfa || (Math.abs(a.y - b.y) > Math.min(a.h, b.h) * 0.5 ? b.y - a.y : a.x - b.x));
  G.arama.sonuclar = sonuclar; G.arama.suruyor = false;
  if (sonuclar.length) aramaSonucunaGit(0);
  aramaPanelYenile();
}
function aramaPanelYenile() {
  if (G.sagSekme !== 'ara' || !$('#aramaKutusu')) return panelCiz();
  const A = G.arama, n = A.sonuclar.length;
  $('#aramaDurum').innerHTML = aramaDurumu();
  $('#insp .arasayi').textContent = n ? `${A.aktif + 1}/${n}` : '';
  $$('#insp .arasatir .tb').forEach((x) => { x.disabled = !n; });
  $('#insp .sres').innerHTML = araSonuclari();
  const c = $('#insp .itabs [data-sekme="ara"]');
  if (c) c.innerHTML = `${ic('search')}Ara${n ? ` <span class="cnt num">${n}</span>` : ''}`;
}
function aramaSonucunaGit(k) {
  const A = G.arama;
  if (!A.sonuclar.length) return;
  A.aktif = (k + A.sonuclar.length) % A.sonuclar.length;
  A.kaydir = true;
  const s = A.sonuclar[A.aktif];
  const el = $(`.vscroll .sayfa[data-i="${s.sayfa}"]`);
  if (!el?.querySelector('.textLayer span')) sayfayaGit(s.sayfa, false); // sayfa henüz çizilmediyse önce oraya
  $$('.vscroll .sayfa').forEach((x) => aramaBoya(x, +x.dataset.i));
  G.sayfa = s.sayfa; sayfaGostergesi();
  $$('#insp .sres button').forEach((x) => x.classList.toggle('on', +x.dataset.sonuc === A.aktif));
  $(`#insp .sres button[data-sonuc="${A.aktif}"]`)?.scrollIntoView({ block: 'nearest' });
  const sayi = $('#insp .arasayi');
  if (sayi) sayi.textContent = `${A.aktif + 1}/${A.sonuclar.length}`;
}
// Bulunan yazıyı sayfanın yazı katmanında, yalnızca eşleşen harfleri <mark> ile sararak işaretler.
// Eşleşme birden çok parçaya bölünmüş olabilir; bu yüzden sayfanın yazısı (metin düğümleri) birleştirilip aranır.
function aramaTemizle(tl) {
  tl.querySelectorAll('mark.hit').forEach((m) => { const ust = m.parentNode; ust.replaceChild(document.createTextNode(m.textContent), m); ust.normalize(); });
}
function aramaBoya(el, i) {
  const tl = el.querySelector('.textLayer');
  if (!tl) return;
  aramaTemizle(tl);
  const A = G.arama, k = trKucuk(A.q.trim());
  if (k.length < 2) return;
  const parcalar = [];
  let tam = '', oncekiSpan = null;
  const tw = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const sp = n.parentElement.closest('.textLayer > span, .textLayer span');
    if (oncekiSpan && sp !== oncekiSpan && oncekiSpan.nextSibling?.nodeName === 'BR') tam += ' ';
    oncekiSpan = sp;
    parcalar.push({ n, bas: tam.length, uz: n.data.length });
    tam += n.data;
  }
  const kk = trKucuk(tam);
  const aktif = A.sonuclar[A.aktif];
  const aktifSira = aktif && aktif.sayfa === i ? aktif.sira : -1;
  const boyalar = new Map();
  let sira = 0;
  for (let p = kk.indexOf(k); p >= 0; p = kk.indexOf(k, p + k.length), sira++) {
    for (const pr of parcalar) {
      const a = Math.max(p, pr.bas), z = Math.min(p + k.length, pr.bas + pr.uz);
      if (a < z) { if (!boyalar.has(pr.n)) boyalar.set(pr.n, []); boyalar.get(pr.n).push([a - pr.bas, z - pr.bas, sira === aktifSira]); }
    }
  }
  for (const [n, araliklar] of boyalar) {
    const t = n.data, parca = document.createDocumentFragment();
    let s = 0;
    for (const [a, z, akt] of araliklar) {
      if (a > s) parca.append(t.slice(s, a));
      const m = document.createElement('mark');
      m.className = 'hit' + (akt ? ' cur' : '');
      m.textContent = t.slice(a, z);
      parca.append(m);
      s = z;
    }
    if (s < t.length) parca.append(t.slice(s));
    n.replaceWith(parca);
  }
  if (A.kaydir && aktifSira >= 0) {
    const hit = tl.querySelector('mark.hit.cur') || tl.querySelector('mark.hit');
    if (hit) { A.kaydir = false; ortala(hit); }
  }
}
// Bulunan yeri görünür alanın ortasına getirir (sayfa büyükse sayfa başına değil, yazının kendisine gider)
function ortala(hedef) {
  const sc = $('.vscroll');
  if (!sc) return;
  const r = hedef.getBoundingClientRect(), q = sc.getBoundingClientRect();
  sc.scrollTo({ top: sc.scrollTop + (r.top - q.top) - sc.clientHeight / 2 + r.height / 2, left: sc.scrollLeft + (r.left - q.left) - sc.clientWidth / 2 + r.width / 2, behavior: 'smooth' });
}

async function gorselKaydet() {
  const b = Belgeler.etkin;
  if (!b?.pdf) return;
  Uygulama.mesgul('Resim hazırlanıyor…');
  try {
    const page = await b.pdf.getPage(G.sayfa + 1);
    const vp = page.getViewport({ scale: PX * 2 });
    const c = document.createElement('canvas');
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise((coz) => c.toBlob(coz, 'image/png'));
    Uygulama.mesgul(false);
    const ad = `${b.ad.replace(/\.pdf$/i, '')}_s${G.sayfa + 1}.png`;
    const r = await dosyaKaydet(blob, ad, 'png');
    if (r) bildirim(`Kaydedildi: ${r}`);
  } finally { Uygulama.mesgul(false); }
}

// ---- Dosya şeridi ----
function seritGorunur() { return Belgeler.liste.length > 1 || !!Belgeler.klasor; }
function seritListesi() {
  const q = trKucuk(G.seritAra);
  const l = Belgeler.liste.filter((b) => !q || trKucuk(b.ad).includes(q));
  if (G.seritSira === 'boyut') l.sort((a, b) => b.boyut - a.boyut);
  else if (G.seritSira === 'isaret') l.sort((a, b) => b.isaretler.length - a.isaretler.length || siralayici.compare(a.yol, b.yol));
  else l.sort((a, b) => siralayici.compare(a.yol, b.yol));
  return l;
}
function kartHTML(b) {
  const n = b.isaretler.length;
  const resim = b.kapak ? `<img src="${b.kapak}" alt="">` : b.hata ? `<span class="khata">${ic('alert')}</span>` : '<span class="kbos"></span>';
  return `<button class="fcard ${Belgeler.etkin === b ? 'on' : ''}" data-belge="${b.id}" title="${esc(b.yol)}">${n ? `<i class="nb">${n}</i>` : ''}${b.degisti ? '<i class="kd" title="Kaydedilmemiş"></i>' : ''}
    <span class="kres">${resim}</span><b>${esc(b.ad.replace(/\.pdf$/i, ''))}</b><small class="num">${b.sayfaSayisi ? b.sayfaSayisi + ' s. · ' : ''}${boyutYaz(b.boyut)}</small></button>`;
}
function seritHTML() {
  if (!seritGorunur()) return '';
  const l = Belgeler.liste, i = l.indexOf(Belgeler.etkin);
  const sol = ic('chev').replace('<svg', '<svg style="transform:rotate(90deg)"'), sag = ic('chev').replace('<svg', '<svg style="transform:rotate(-90deg)"');
  const yol = Belgeler.klasor ? `${ic('folder')}<b>${esc(Belgeler.klasor)}</b>` : `${ic('layers')}<b>Açık dosyalar</b>`;
  return `<div class="fstrip ${G.seritAcik ? '' : 'closed'}">
    <div class="fhead"><span class="crumb">${yol}</span><small class="num">${l.length} PDF</small>
      <span class="fnav"><button class="tb icon" data-act="oncekiDosya" title="Önceki dosya (Alt+←)">${sol}</button><span class="num">${i + 1} / ${l.length}</span><button class="tb icon" data-act="sonrakiDosya" title="Sonraki dosya (Alt+→)">${sag}</button></span>
      <span class="tspace"></span>
      <span class="fsearch">${ic('search')}<input id="seritAra" placeholder="Dosya ara…" value="${esc(G.seritAra)}"></span>
      <select class="inp fsort" id="seritSira" title="Sıralama"><option value="ad" ${G.seritSira === 'ad' ? 'selected' : ''}>Ada göre</option><option value="boyut" ${G.seritSira === 'boyut' ? 'selected' : ''}>Boyuta göre</option><option value="isaret" ${G.seritSira === 'isaret' ? 'selected' : ''}>İşaretliler önce</option></select>
      <button class="tb icon" data-act="klasorAc" title="Başka klasör aç">${ic('folder')}</button>
      <button class="tb icon" data-act="dosyaEkle" title="Dosya ekle">${ic('plus')}</button>
      <button class="tb icon" data-act="serit" title="${G.seritAcik ? 'Şeridi gizle' : 'Şeridi göster'}">${ic('chev').replace('<svg', G.seritAcik ? '<svg' : '<svg style="transform:rotate(180deg)"')}</button></div>
    <div class="fcards">${seritListesi().map(kartHTML).join('') || '<div class="hint" style="padding:18px">Eşleşen dosya yok</div>'}</div></div>`;
}
const Seritler = {
  bagla() {
    G.kartGozlemci?.disconnect();
    const kok = $('.fcards');
    if (!kok) return;
    G.kartGozlemci = new IntersectionObserver((gs) => {
      for (const g of gs) if (g.isIntersecting) { const b = Belgeler.liste.find((x) => x.id === +g.target.dataset.belge); if (b) kapakHazirla(b); }
    }, { root: kok, rootMargin: '0px 300px' });
    $$('.fcard', kok).forEach((k) => G.kartGozlemci.observe(k));
    const on = kok.querySelector('.fcard.on');
    if (on) { const r = on.getBoundingClientRect(), q = kok.getBoundingClientRect(); if (r.left < q.left || r.right > q.right) on.scrollIntoView({ inline: 'center', block: 'nearest' }); }
  },
  // Şeridi baştan çizmeden günceller (yatay kaydırma yeri korunur)
  guncelle() {
    const s = $('#center .fstrip');
    if (!seritGorunur()) { s?.remove(); return; }
    if (!s) { $('#center').insertAdjacentHTML('beforeend', seritHTML()); return this.bagla(); }
    const yeni = document.createElement('div');
    yeni.innerHTML = seritHTML();
    const kartlar = s.querySelector('.fcards'), x = kartlar.scrollLeft;
    const odak = document.activeElement?.id === 'seritAra';
    s.replaceWith(yeni.firstElementChild);
    $('#center .fcards').scrollLeft = x;
    if (odak) { const n = $('#seritAra'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    this.bagla();
    altHizala();
  },
  kartYenile(b) {
    const k = $(`.fcard[data-belge="${b.id}"]`);
    if (!k) return;
    const t = document.createElement('div');
    t.innerHTML = kartHTML(b);
    k.replaceWith(t.firstElementChild);
  },
};
function dosyaDegistir(yon) {
  const l = seritListesi();
  if (l.length < 2) return;
  const i = l.indexOf(Belgeler.etkin);
  belgeAc(l[(i + yon + l.length) % l.length]);
}

const Goruntule = { ciz: goruntuleCiz, panelCiz, altHizala, icBaglanti, bosArama, sayfayaGit, yakinlastir, sigdir, aramaGirdisi, aramaSonucunaGit, gorselKaydet, dosyaDegistir };
