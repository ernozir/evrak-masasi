'use strict';
// İşaretleme: vurgula, altını/üstünü çiz, not, kalem, kutu, yazı.
//
// Koordinatlar "sayfa birimi"dir: pdf.js'in 1 ölçekli görünümünde, sol üst köşe (0,0).
// Ekranda .alayer katmanı bu birimlerle çizilir ve sayfanın ölçeğiyle büyütülür.
// Kaydederken viewport.convertToPdfPoint ile PDF koordinatlarına çevrilir.
//
// Kaydetme iki türlü:
//  - "duzen": standart PDF işaretleri (Highlight, Underline, StrikeOut, Square, Ink, Text, FreeText).
//     Her işaretin içine kendi verisi (/EMVeri) de yazılır; dosya Evrak Masası'nda yeniden
//     açıldığında işaretler düzenlenebilir hâle geri gelir.
//  - "gom": işaretler sayfanın içeriğine çizilir (kalıcı, silinemez).

const ARACLAR = [
  ['sec', 'Seç', 'cursor', 'V', 'Yazı seçmek ya da işareti seçip taşımak için tıklayın'],
  ['hl', 'Vurgula', 'highlighter', 'H', 'Vurgulamak istediğiniz yazının üzerinden sürükleyin'],
  ['ul', 'Altını çiz', 'underline', 'U', 'Altını çizmek istediğiniz yazının üzerinden sürükleyin'],
  ['st', 'Üstünü çiz', 'strike', 'S', 'Üstünü çizmek istediğiniz yazının üzerinden sürükleyin'],
  ['not', 'Not ekle', 'note', 'N', 'Notu koymak istediğiniz yere tıklayın'],
  ['kalem', 'Kalem', 'pen', 'P', 'Serbestçe çizmek için sürükleyin'],
  ['kutu', 'Kutu', 'square', 'B', 'Çerçeve içine almak için sürükleyin'],
  ['yazi', 'Yazı', 'type', 'T', 'Sayfaya yazı eklemek için tıklayın'],
];
const RENKLER = [['#facc15', 'Sarı'], ['#4ade80', 'Yeşil'], ['#f472b6', 'Pembe'], ['#60a5fa', 'Mavi'], ['#e11d48', 'Kırmızı'], ['#111827', 'Siyah']];
const TURLER = { hl: ['Vurgu', 'highlighter'], ul: ['Altı çizili', 'underline'], st: ['Üstü çizili', 'strike'], not: ['Not', 'note'], kalem: ['Kalem', 'pen'], kutu: ['Kutu', 'square'], yazi: ['Yazı', 'type'] };
const VARSAYILAN_RENK = { hl: '#facc15', ul: '#e11d48', st: '#e11d48', not: '#facc15', kalem: '#e11d48', kutu: '#e11d48', yazi: '#111827' };
const NOT_BOYU = 16;
const YAZI_BOYUTLARI = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40];

const I = {
  arac: 'sec',
  renkler: { ...VARSAYILAN_RENK, ...depo.al('renkler', {}) },
  secili: null,
  sekme: 'notlar',
  filtre: 'tum',
  kayitModu: depo.al('kayitModu', 'duzen'),
  secimSurukle: false,
  yaziBoyutu: depo.al('yaziBoyutu', 13),
};
let isaretSayaci = 0;
const yeniId = () => Date.now().toString(36) + (++isaretSayaci).toString(36);
const yazarAdi = () => depo.al('yazar', '') || 'Kullanıcı';

// ---- Geri al / yinele ----
function kayitNoktasi(b) {
  b.geriAl.push(JSON.stringify(b.isaretler));
  if (b.geriAl.length > 60) b.geriAl.shift();
  b.ileriAl = [];
}
function geriAl(b = Belgeler.etkin) {
  if (!b?.geriAl.length) return;
  b.ileriAl.push(JSON.stringify(b.isaretler));
  b.isaretler = JSON.parse(b.geriAl.pop());
  b.degisti = true; I.secili = null;
  Uygulama.ciz();
}
function ileriAl(b = Belgeler.etkin) {
  if (!b?.ileriAl.length) return;
  b.geriAl.push(JSON.stringify(b.isaretler));
  b.isaretler = JSON.parse(b.ileriAl.pop());
  b.degisti = true; I.secili = null;
  Uygulama.ciz();
}

// Seçilen işaret sağ panelde görünsün: Notlar sekmesi açılır, filtre onu gizliyorsa Tümü'ne geçilir
function notlardaGoster(a) {
  G.sagSekme = 'notlar';
  const gorunur = I.filtre === 'tum' || (I.filtre === 'isaret' && ['hl', 'ul', 'st'].includes(a.tur)) || (I.filtre === 'not' && ['not', 'yazi'].includes(a.tur)) || (I.filtre === 'cizim' && ['kalem', 'kutu'].includes(a.tur));
  if (!gorunur) I.filtre = 'tum';
}
function isaretBitti(b, a, mesaj = true) {
  b.degisti = true;
  I.secili = a.id;
  notlardaGoster(a);
  // not ve yazının içeriği sağ panelde yazılır: panel kapalıysa açılır
  if ((a.tur === 'not' || a.tur === 'yazi') && !G.sagAcik) { G.sagAcik = true; depo.yaz('sagAcik', true); }
  Uygulama.ciz();
  if (mesaj) bildirim(`${TURLER[a.tur][0]} eklendi`, { geriAl: () => geriAl(b) });
  if (a.tur === 'not' || a.tur === 'yazi') setTimeout(() => { const t = $(`[data-metin="${a.id}"]`); if (t) { t.focus(); t.select(); } }, 30);
}
function isaretSil(b, id) {
  kayitNoktasi(b);
  b.isaretler = b.isaretler.filter((a) => a.id !== id);
  b.degisti = true;
  if (I.secili === id) I.secili = null;
  Uygulama.ciz();
  bildirim('İşaret silindi', { geriAl: () => geriAl(b) });
}

// ---- Çizim (ekran) ----
// Kalem yolu: ara noktalardan geçen yumuşak eğri (ekranda); PDF'e sık noktalı çizgi olarak yazılır
const n1 = (v) => v.toFixed(1);
function yolD(yol) {
  if (yol.length < 3) return yol.map((p, k) => (k ? 'L' : 'M') + n1(p[0]) + ' ' + n1(p[1])).join('');
  let d = `M${n1(yol[0][0])} ${n1(yol[0][1])}`;
  for (let k = 1; k < yol.length - 1; k++) {
    const mx = (yol[k][0] + yol[k + 1][0]) / 2, my = (yol[k][1] + yol[k + 1][1]) / 2;
    d += `Q${n1(yol[k][0])} ${n1(yol[k][1])} ${n1(mx)} ${n1(my)}`;
  }
  const s = yol[yol.length - 1];
  return d + `L${n1(s[0])} ${n1(s[1])}`;
}
const TUTAMACLAR = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
function isaretHTML(b, i) {
  const d = b.boyutlar[i];
  return b.isaretler.filter((a) => a.sayfa === i).map((a) => {
    const sel = I.secili === a.id ? ' sel' : '';
    const c = `--ac:${a.renk}`;
    if (a.rects) {
      let tut = '';
      if (sel && a.tur === 'kutu') { // boyutlandırma tutamaçları
        const [x, y, w, h] = a.rects[0];
        const yer = { nw: [x, y], n: [x + w / 2, y], ne: [x + w, y], e: [x + w, y + h / 2], se: [x + w, y + h], s: [x + w / 2, y + h], sw: [x, y + h], w: [x, y + h / 2] };
        tut = TUTAMACLAR.map((k) => `<b class="tut" data-tut="${k}" style="left:${yer[k][0]}px;top:${yer[k][1]}px"></b>`).join('');
      }
      return `<div class="an grp ${a.tur}${sel}" data-aid="${a.id}" style="${c}">${a.rects.map((r) => `<i style="left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px"></i>`).join('')}${tut}</div>`;
    }
    if (a.tur === 'kalem') return `<svg class="an kalem${sel}" data-aid="${a.id}" style="${c}" width="${d.w}" height="${d.h}" viewBox="0 0 ${d.w} ${d.h}"><path d="${yolD(a.yol)}" stroke-width="${a.kalinlik || 2}"/></svg>`;
    if (a.tur === 'not') {
      let acik = '';
      if (sel && a.metin) { // açılır not, simgenin üstüne binmesin: sağa sığmazsa sola, o da olmazsa alta
        const gen = 180;
        let px = a.x + NOT_BOYU + 6, py = a.y - 2;
        if (px + gen > d.w - 4) px = a.x - 6 - gen;
        if (px < 4) { px = Math.max(4, Math.min(a.x, d.w - 4 - gen)); py = a.y + NOT_BOYU + 6; }
        acik = `<div class="npop" style="left:${px}px;top:${Math.max(4, py)}px;width:${gen}px"><div class="nph"><b>${esc(a.yazar)}</b><small>${kisaZaman(a.zaman)}</small></div>${esc(a.metin)}</div>`;
      }
      return `<div class="an not${sel}" data-aid="${a.id}" style="left:${a.x}px;top:${a.y}px;${c}" title="${esc(a.metin)}">${ic('note')}</div>${acik}`;
    }
    if (a.tur === 'yazi') {
      const tut = sel ? ['w', 'e'].map((k) => `<b class="tut" data-tut="${k}" style="left:${k === 'w' ? 0 : 100}%;top:50%"></b>`).join('') : '';
      const gen = a.genislik ? `width:${a.genislik}px;` : '';
      return `<div class="an yazi${sel}${a.genislik ? ' sarili' : ''}" data-aid="${a.id}" style="left:${a.x}px;top:${a.y}px;font-size:${a.boyut}px;${gen}${c}" title="Kenarlarından sürükleyerek genişliği değiştirin">${esc(a.metin) || '&nbsp;'}${tut}</div>`;
    }
    return '';
  }).join('');
}
function katmanCiz(b, el) {
  const i = +el.dataset.i;
  el.querySelector('.alayer').innerHTML = isaretHTML(b, i);
}
function tumKatmanlariCiz(b = Belgeler.etkin) {
  if (!b) return;
  $$('.vscroll .sayfa').forEach((el) => katmanCiz(b, el));
}

// ---- Fare / kalem olayları ----
function noktaFn(b, el) {
  const r = el.getBoundingClientRect();
  const s = r.width / b.boyutlar[+el.dataset.i].w;
  return (ev) => [(ev.clientX - r.left) / s, (ev.clientY - r.top) / s];
}

function olaylariKur(kok) {
  kok.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const b = Belgeler.etkin, el = e.target.closest('.sayfa');
    if (!b || !el) return;
    cubukGizle();
    const i = +el.dataset.i, an = e.target.closest('.an[data-aid]');
    const P = noktaFn(b, el);

    if (I.arac === 'sec') {
      const tut = e.target.closest('[data-tut]');
      if (tut && an) { e.preventDefault(); return boyutlandir(b, an.dataset.aid, tut.dataset.tut, P, e); }
      if (an) { e.preventDefault(); return tasimaBaslat(b, an.dataset.aid, P, e); }
      if (I.secili) { I.secili = null; tumKatmanlariCiz(b); Uygulama.panelCiz(); }
      return; // yazı seçimine izin ver
    }
    if (['hl', 'ul', 'st'].includes(I.arac)) {
      if (e.target.closest('.textLayer span')) { I.secimSurukle = true; return; } // tarayıcının yazı seçimi
      return dikdortgenCiz(b, el, i, I.arac, P, e); // yazı yoksa (taranmış sayfa) dikdörtgen
    }
    if (I.arac === 'kutu') return dikdortgenCiz(b, el, i, 'kutu', P, e);
    if (I.arac === 'kalem') return kalemCiz(b, el, i, P, e);
    if (I.arac === 'not' || I.arac === 'yazi') {
      e.preventDefault();
      const [x, y] = P(e);
      kayitNoktasi(b);
      const a = I.arac === 'not'
        ? { id: yeniId(), tur: 'not', sayfa: i, renk: I.renkler.not, x: x - NOT_BOYU / 2, y: y - NOT_BOYU / 2, metin: '', yazar: yazarAdi(), zaman: Date.now() }
        : { id: yeniId(), tur: 'yazi', sayfa: i, renk: I.renkler.yazi, x, y: y - I.yaziBoyutu * 0.7, boyut: I.yaziBoyutu, metin: 'Yazı', yazar: yazarAdi(), zaman: Date.now() };
      b.isaretler.push(a);
      I.arac = 'sec'; // not ve yazıdan sonra seçime dönülür: hemen yazılabilir, taşınabilir
      isaretBitti(b, a);
    }
  });

  document.addEventListener('pointerup', () => {
    if (!I.secimSurukle) return;
    I.secimSurukle = false;
    setTimeout(() => secimdenIsaret(I.arac), 0);
  });
  // Seç aracında yazı seçilince küçük işaret çubuğu
  kok.addEventListener('mouseup', () => { if (I.arac === 'sec') setTimeout(cubukGoster, 0); });
}

function dikdortgenCiz(b, el, i, tur, P, e) {
  e.preventDefault();
  const [x0, y0] = P(e);
  const a = { id: yeniId(), tur, sayfa: i, renk: I.renkler[tur], rects: [[x0, y0, 0, 0]], metin: '', yazar: yazarAdi(), zaman: Date.now() };
  let eklendi = false;
  const mv = (ev) => {
    const [x, y] = P(ev);
    a.rects[0] = [Math.min(x0, x), Math.min(y0, y), Math.abs(x - x0), Math.abs(y - y0)];
    if (!eklendi) { kayitNoktasi(b); b.isaretler.push(a); eklendi = true; }
    katmanCiz(b, el);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
    if (!eklendi) return;
    const r = a.rects[0];
    if (r[2] < 4 || r[3] < 3) { b.isaretler.pop(); b.geriAl.pop(); katmanCiz(b, el); return; }
    if (tur === 'kutu') I.arac = 'sec'; // kutudan sonra seçime dön: hemen boyutlandırılabilir
    isaretBitti(b, a);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}

function kalemCiz(b, el, i, P, e) {
  e.preventDefault();
  const a = { id: yeniId(), tur: 'kalem', sayfa: i, renk: I.renkler.kalem, kalinlik: 2, yol: [P(e)], metin: '', yazar: yazarAdi(), zaman: Date.now() };
  kayitNoktasi(b); b.isaretler.push(a);
  const mv = (ev) => {
    const p = P(ev), son = a.yol[a.yol.length - 1];
    if (Math.hypot(p[0] - son[0], p[1] - son[1]) < 1.2) return;
    a.yol.push(p); katmanCiz(b, el);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
    if (a.yol.length < 2) { b.isaretler.pop(); b.geriAl.pop(); katmanCiz(b, el); return; }
    isaretBitti(b, a, false);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}

function tasimaBaslat(b, id, P, e) {
  const a = b.isaretler.find((x) => x.id === id);
  if (!a) return;
  if (!G.sagAcik) { // sağ panel kapalıysa açılır ve işaret notlarda gösterilir (bu tıklamada taşıma başlamaz)
    I.secili = id; notlardaGoster(a); G.sagAcik = true; depo.yaz('sagAcik', true);
    tumKatmanlariCiz(b); Uygulama.ciz();
    return;
  }
  if (I.secili !== id) { I.secili = id; notlardaGoster(a); tumKatmanlariCiz(b); Uygulama.ciz(); }
  if (!['not', 'yazi', 'kutu', 'kalem'].includes(a.tur)) return; // yazıya bağlı işaretler taşınmaz
  const [x0, y0] = P(e);
  const ilk = JSON.stringify(a);
  let tasindi = false;
  const el = $(`.vscroll .sayfa[data-i="${a.sayfa}"]`);
  const mv = (ev) => {
    const [x, y] = P(ev), dx = x - x0, dy = y - y0;
    if (!tasindi && Math.hypot(dx, dy) < 2) return;
    if (!tasindi) { kayitNoktasi(b); tasindi = true; }
    const o = JSON.parse(ilk);
    if (o.rects) a.rects = o.rects.map((r) => [r[0] + dx, r[1] + dy, r[2], r[3]]);
    if (o.yol) a.yol = o.yol.map((p) => [p[0] + dx, p[1] + dy]);
    if (o.x != null) { a.x = o.x + dx; a.y = o.y + dy; }
    katmanCiz(b, el);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
    if (tasindi) { b.degisti = true; Uygulama.ciz(); }
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}

// Yazı kutusunu kenarından daraltıp genişletmek: yazı alt satırlara kayar (yazı boyutu değişmez).
function yaziGenislet(b, a, yon, P, e) {
  const kutu = $(`.an.yazi[data-aid="${a.id}"]`);
  if (!kutu) return;
  const w0 = kutu.offsetWidth, x0 = a.x, [px] = P(e);
  const en_az = Math.max(24, a.boyut * 2);
  const el = $(`.vscroll .sayfa[data-i="${a.sayfa}"]`);
  let degisti = false;
  const mv = (ev) => {
    const dx = P(ev)[0] - px;
    const w = Math.max(en_az, yon === 'e' ? w0 + dx : w0 - dx);
    if (!degisti) { kayitNoktasi(b); degisti = true; }
    a.genislik = Math.round(w);
    if (yon === 'w') a.x = x0 + w0 - w;
    katmanCiz(b, el);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
    if (degisti) { b.degisti = true; Uygulama.ciz(); }
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}

function boyutlandir(b, id, yon, P, e) {
  const a = b.isaretler.find((x) => x.id === id);
  if (a?.tur === 'yazi') return yaziGenislet(b, a, yon, P, e);
  if (!a?.rects) return;
  const [x0, y0] = P(e), [rx, ry, rw, rh] = a.rects[0];
  const el = $(`.vscroll .sayfa[data-i="${a.sayfa}"]`);
  let degisti = false;
  const mv = (ev) => {
    const [x, y] = P(ev), dx = x - x0, dy = y - y0;
    if (!degisti) { kayitNoktasi(b); degisti = true; }
    let x1 = rx, y1 = ry, x2 = rx + rw, y2 = ry + rh;
    if (yon.includes('w')) x1 = Math.min(x2 - 6, rx + dx);
    if (yon.includes('e')) x2 = Math.max(x1 + 6, rx + rw + dx);
    if (yon.includes('n')) y1 = Math.min(y2 - 6, ry + dy);
    if (yon.includes('s')) y2 = Math.max(y1 + 6, ry + rh + dy);
    a.rects[0] = [x1, y1, x2 - x1, y2 - y1];
    katmanCiz(b, el);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
    if (degisti) { b.degisti = true; Uygulama.ciz(); }
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
}

// Seçili yazıdan işaret: seçimin dikdörtgenleri sayfalara ayrılır ve satır satır birleştirilir.
function secimdenIsaret(tur, notMetni = null) {
  const b = Belgeler.etkin, sel = getSelection();
  if (!b || !sel || sel.isCollapsed || !sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (!range.commonAncestorContainer.parentElement?.closest('.vscroll') && !(range.commonAncestorContainer.closest?.('.vscroll'))) return false;
  const alinti = sel.toString().replace(/\s+/g, ' ').trim();
  const sayfalar = $$('.vscroll .sayfa');
  const gruplar = new Map();
  const yukseklikler = [];
  const hamlar = [...range.getClientRects()].filter((r) => r.width >= 1 && r.height >= 1);
  hamlar.forEach((r) => yukseklikler.push(r.height));
  yukseklikler.sort((x, y) => x - y);
  const ortanca = yukseklikler[Math.floor(yukseklikler.length / 2)] || 0;
  for (const r of hamlar) {
    if (r.height > ortanca * 2.5) continue; // satır sonu / içerik sonu gibi büyük kutuları at
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const el = sayfalar.find((p) => { const q = p.getBoundingClientRect(); return cx >= q.left && cx <= q.right && cy >= q.top && cy <= q.bottom; });
    if (!el) continue;
    const i = +el.dataset.i, q = el.getBoundingClientRect(), s = q.width / b.boyutlar[i].w;
    if (!gruplar.has(i)) gruplar.set(i, []);
    gruplar.get(i).push([(r.left - q.left) / s, (r.top - q.top) / s, r.width / s, r.height / s]);
  }
  sel.removeAllRanges();
  cubukGizle();
  if (!gruplar.size) return false;
  kayitNoktasi(b);
  let son;
  for (const [i, rs] of gruplar) {
    if (tur === 'not') {
      const r = satirBirlestir(rs).pop();
      son = { id: yeniId(), tur: 'not', sayfa: i, renk: I.renkler.not, x: r[0] + r[2] + 4, y: r[1] + r[3] / 2 - NOT_BOYU / 2, metin: notMetni || '', alinti, yazar: yazarAdi(), zaman: Date.now() };
    } else {
      son = { id: yeniId(), tur, sayfa: i, renk: I.renkler[tur], rects: satirBirlestir(rs), metin: '', alinti, yazar: yazarAdi(), zaman: Date.now() };
    }
    b.isaretler.push(son);
    if (tur === 'not') break;
  }
  isaretBitti(b, son);
  return true;
}

// Aynı satırdaki parçaları tek dikdörtgende toplar; iç içe olanları atar.
function satirBirlestir(rs) {
  const s = rs.map((r) => [...r]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const out = [];
  for (const r of s) {
    const o = out.find((q) => {
      const ust = Math.max(q[1], r[1]), alt = Math.min(q[1] + q[3], r[1] + r[3]);
      const dikey = alt - ust >= Math.min(q[3], r[3]) * 0.5;
      const bosluk = Math.max(q[0], r[0]) - Math.min(q[0] + q[2], r[0] + r[2]);
      return dikey && bosluk < Math.max(q[3], r[3]) * 0.8;
    });
    if (o) {
      const x1 = Math.min(o[0], r[0]), y1 = Math.min(o[1], r[1]), x2 = Math.max(o[0] + o[2], r[0] + r[2]), y2 = Math.max(o[1] + o[3], r[1] + r[3]);
      o[0] = x1; o[1] = y1; o[2] = x2 - x1; o[3] = y2 - y1;
    } else out.push(r);
  }
  return out.map((r) => r.map((v) => Math.round(v * 100) / 100));
}

// ---- Seçim çubuğu (Seç aracında yazı seçilince) ----
function cubukGoster() {
  const sel = getSelection(), bar = $('#secimCubugu');
  if (!sel || sel.isCollapsed || !sel.rangeCount) return cubukGizle();
  const n = sel.anchorNode?.parentElement;
  if (!n?.closest('.vscroll .textLayer')) return cubukGizle();
  const rs = [...sel.getRangeAt(0).getClientRects()].filter((r) => r.width > 1);
  if (!rs.length) return cubukGizle();
  const son = rs[rs.length - 1];
  bar.classList.add('on');
  const w = bar.offsetWidth;
  bar.style.left = Math.max(8, Math.min(innerWidth - w - 8, son.right - w / 2)) + 'px';
  bar.style.top = Math.min(innerHeight - 50, son.bottom + 8) + 'px';
}
function cubukGizle() { $('#secimCubugu')?.classList.remove('on'); }
function cubukKur() {
  const bar = $('#secimCubugu');
  bar.innerHTML = [['hl', 'Vurgula', 'highlighter'], ['ul', 'Altını çiz', 'underline'], ['st', 'Üstünü çiz', 'strike'], ['not', 'Not ekle', 'note'], ['kopyala', 'Kopyala', 'copy']]
    .map(([k, ad, ik]) => `<button data-sc="${k}" title="${ad}">${ic(ik)}<span>${ad}</span></button>`).join('');
  bar.addEventListener('mousedown', (e) => e.preventDefault()); // seçim kaybolmasın
  // seçim kalkınca (başka yere tıklama, Esc, programla) çubuk da kapansın
  document.addEventListener('selectionchange', () => { const sel = getSelection(); if (!sel || sel.isCollapsed) cubukGizle(); });
  bar.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-sc]')?.dataset.sc;
    if (!k) return;
    if (k === 'kopyala') {
      const t = getSelection().toString();
      try { await navigator.clipboard.writeText(t); } catch { document.execCommand('copy'); }
      cubukGizle(); bildirim('Kopyalandı');
      return;
    }
    secimdenIsaret(k);
  });
}

// ---- Sağ panel: Notlar ----
function panelNotlar(b) {
  const flt = I.filtre;
  const gec = (a) => flt === 'tum' || (flt === 'isaret' && ['hl', 'ul', 'st'].includes(a.tur)) || (flt === 'not' && ['not', 'yazi'].includes(a.tur)) || (flt === 'cizim' && ['kalem', 'kutu'].includes(a.tur));
  const ust = (a) => a.rects ? a.rects[0][1] : a.yol ? a.yol[0][1] : a.y;
  const liste = b.isaretler.filter(gec).sort((x, y) => x.sayfa - y.sayfa || ust(x) - ust(y));
  let son = null;
  const ogeler = liste.map((a) => {
    const bas = a.sayfa !== son ? `<div class="ngrp">Sayfa ${a.sayfa + 1}</div>` : '';
    son = a.sayfa;
    const T = TURLER[a.tur], on = I.secili === a.id;
    const alinti = a.alinti ? `<q>${esc(a.alinti.length > 140 ? a.alinti.slice(0, 140) + '…' : a.alinti)}</q>` : '';
    const yerTutucu = a.tur === 'yazi' ? 'Sayfada görünecek yazı…' : 'Açıklama yazın…';
    return bas + `<div class="nitem ${on ? 'on' : ''}" data-aid="${a.id}">
      <span class="nic" style="--ac:${a.renk}">${ic(T[1])}</span>
      <div class="nb2"><div class="nt"><b>${T[0]}</b><small>${esc(a.yazar)} · ${kisaZaman(a.zaman)}</small></div>${alinti}
      ${on ? `<textarea class="inp nta" data-metin="${a.id}" placeholder="${yerTutucu}">${esc(a.metin)}</textarea>
        ${a.tur === 'yazi' ? `<div class="yboy"><span>Yazı boyutu</span><button class="tb icon" data-yboy="-1" title="Küçült">${ic('minus')}</button><select class="inp" data-yboyut="${a.id}">${[...new Set([...YAZI_BOYUTLARI, a.boyut])].sort((x, y) => x - y).map((v) => `<option value="${v}" ${v === a.boyut ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="tb icon" data-yboy="1" title="Büyüt">${ic('plus')}</button></div>
        <div class="yboy"><span>Renk</span><span class="yrenk">${RENKLER.map((r) => `<button class="${a.renk === r[0] ? 'on' : ''}" data-renk="${r[0]}" title="${r[1]}" style="--c:${r[0]}"></button>`).join('')}</span></div>
        ${a.genislik ? `<div class="yboy"><span>Genişlik: ${Math.round(a.genislik)} · <button class="lnk" data-ygenislik="${a.id}">kendiliğinden</button></span></div>` : ''}` : ''}
        <div class="nact"><button class="tb danger" data-isil="${a.id}">${ic('trash')}Sil</button></div>`
        : `<p>${a.metin ? esc(a.metin) : '<i>Açıklama yok</i>'}</p>`}</div></div>`;
  }).join('');
  const diger = (b.digerNotlar || []);
  const digerHTML = diger.length ? `<div class="ngrp" style="margin-top:18px">Belgede önceden olan işaretler · ${diger.length}</div>
    <p class="hint" style="margin:0 2px 8px">Başka bir programla eklenmiş; burada yalnızca görüntülenir.</p>
    ${diger.map((d) => `<div class="nitem ro" data-goto="${d.sayfa}"><span class="nic" style="--ac:#94a3b8">${ic('note')}</span><div class="nb2"><div class="nt"><b>${esc(d.tur)}</b><small>Sayfa ${d.sayfa + 1}${d.yazar ? ' · ' + esc(d.yazar) : ''}</small></div><p>${d.metin ? esc(d.metin) : '<i>Açıklama yok</i>'}</p></div></div>`).join('')}` : '';
  return `<div class="chips" style="margin-bottom:12px">${[['tum', 'Tümü'], ['isaret', 'Vurgular'], ['not', 'Notlar'], ['cizim', 'Çizimler']].map((x) => `<button class="chip ${flt === x[0] ? 'on' : ''}" data-nflt="${x[0]}">${x[1]}</button>`).join('')}</div>
    ${ogeler || `<div class="empty">${ic('highlighter')}<b>${b.isaretler.length ? 'Bu türde işaret yok' : 'Bu dosyada işaret yok'}</b><span>Yazıyı seçip <b>H</b> tuşuna basın ya da üstteki araçlardan birini seçin.</span></div>`}
    ${digerHTML}`;
}
function panelAlt(b) {
  return `<div class="field" style="margin-bottom:10px"><label>İşaretler nasıl kaydedilsin?</label>
      <div class="seg">${[['duzen', 'Düzenlenebilir'], ['gom', 'Sayfaya göm']].map((x) => `<button class="${I.kayitModu === x[0] ? 'on' : ''}" data-kmod="${x[0]}">${x[1]}</button>`).join('')}</div>
      <div class="hint" style="margin-top:6px">${I.kayitModu === 'duzen' ? 'Acrobat, Edge ve Mac Önizleme’de not olarak görünür; burada yeniden açınca düzenlenebilir.' : 'Sayfanın parçası olur, silinemez. Son hâli müşteriye gönderirken kullanın.'}</div></div>
    <div class="row" style="gap:8px"><button class="btn primary" style="flex:1" data-act="kaydet" ${b.sifreli ? 'disabled title="Şifreli PDF’e kaydedilemez"' : ''}>${ic('save')}Kaydet</button><button class="btn" data-act="excel" title="Notları Excel’e aktar">${ic('sheetx')}Excel</button></div>`;
}

// Başka programların eklediği işaretleri listeler (salt okunur).
const DIGER_TURLER = { Text: 'Not', FreeText: 'Yazı', Highlight: 'Vurgu', Underline: 'Altı çizili', StrikeOut: 'Üstü çizili', Squiggly: 'Dalgalı çizgi', Square: 'Kutu', Circle: 'Daire', Ink: 'Kalem', Line: 'Çizgi', Polygon: 'Çokgen', PolyLine: 'Çoklu çizgi', Stamp: 'Damga', Caret: 'Ekleme işareti' };
async function digerNotlariYukle(b) {
  if (!b?.pdf || b.digerNotlar) return;
  const liste = [];
  for (let i = 0; i < b.pdf.numPages; i++) {
    const ann = await (await b.pdf.getPage(i + 1)).getAnnotations();
    for (const a of ann) if (DIGER_TURLER[a.subtype]) liste.push({ sayfa: i, tur: DIGER_TURLER[a.subtype], metin: a.contentsObj?.str || '', yazar: a.titleObj?.str || '' });
  }
  b.digerNotlar = liste;
  if (b === Belgeler.etkin && liste.length) Uygulama.panelCiz();
}

// ---- PDF'e yazma ----
const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
const f2 = (n) => (Math.round(n * 100) / 100).toString();
function pdfTarih(ms) {
  const d = new Date(ms), p = (n) => String(n).padStart(2, '0');
  return `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function yuvarlakDikdortgen(x1, y1, x2, y2, r) {
  const k = 0.5523 * r;
  return `${f2(x1 + r)} ${f2(y1)} m ${f2(x2 - r)} ${f2(y1)} l ${f2(x2 - r + k)} ${f2(y1)} ${f2(x2)} ${f2(y1 + r - k)} ${f2(x2)} ${f2(y1 + r)} c ` +
    `${f2(x2)} ${f2(y2 - r)} l ${f2(x2)} ${f2(y2 - r + k)} ${f2(x2 - r + k)} ${f2(y2)} ${f2(x2 - r)} ${f2(y2)} c ` +
    `${f2(x1 + r)} ${f2(y2)} l ${f2(x1 + r - k)} ${f2(y2)} ${f2(x1)} ${f2(y2 - r + k)} ${f2(x1)} ${f2(y2 - r)} c ` +
    `${f2(x1)} ${f2(y1 + r)} l ${f2(x1)} ${f2(y1 + r - k)} ${f2(x1 + r - k)} ${f2(y1)} ${f2(x1 + r)} ${f2(y1)} c h`;
}

// Yazıyı (Türkçe karakterlerle) resim olarak hazırlar: PDF'in standart yazı tipleri ğ, ş, ı, İ yazamaz.
function yaziResmi(metin, { boyut = 13, renk = '#111827', arka = null, enFazla = null }) {
  const k = 4, c = document.createElement('canvas'), ctx = c.getContext('2d');
  const font = `${boyut * k}px Arial, Helvetica, sans-serif`;
  ctx.font = font;
  const satirlar = [];
  for (const parca of String(metin || ' ').split('\n')) {
    if (!enFazla) { satirlar.push(parca); continue; }
    let s = '';
    for (const kelime of parca.split(' ')) {
      const dene = s ? s + ' ' + kelime : kelime;
      if (ctx.measureText(dene).width > enFazla * k && s) { satirlar.push(s); s = kelime; } else s = dene;
    }
    satirlar.push(s);
  }
  const bosluk = (arka ? 6 : 1) * k, sy = boyut * 1.3 * k;
  const w = Math.ceil(Math.max(...satirlar.map((s) => ctx.measureText(s).width)) + bosluk * 2);
  const h = Math.ceil(sy * satirlar.length + bosluk * 2);
  c.width = w; c.height = h;
  ctx.font = font;
  if (arka) {
    ctx.fillStyle = arka; ctx.strokeStyle = 'rgba(161,98,7,.45)'; ctx.lineWidth = k;
    ctx.beginPath(); ctx.roundRect(k / 2, k / 2, w - k, h - k, 4 * k); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = arka ? '#3f3f46' : renk; ctx.textBaseline = 'top';
  satirlar.forEach((s, j) => ctx.fillText(s, bosluk, bosluk + j * sy + boyut * 0.12 * k));
  const ikili = atob(c.toDataURL('image/png').split(',')[1]);
  const png = new Uint8Array(ikili.length);
  for (let j = 0; j < ikili.length; j++) png[j] = ikili.charCodeAt(j);
  return { png, w: w / k, h: h / k };
}

// Bir işaretin görünümü: PDF koordinatlarında içerik akışı + sınır kutusu + işaret türüne özel alanlar.
async function gorunumHazirla(pdfDoc, a, P, mod, sinir) {
  const [r, g, bl] = hexRgb(a.renk), rgb = `${f2(r)} ${f2(g)} ${f2(bl)}`;
  const kutu = ([x, y, w, h]) => { const p1 = P(x, y), p2 = P(x + w, y + h); return [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])]; };
  const birlesim = (ks, pay = 0) => [Math.min(...ks.map((k) => k[0])) - pay, Math.min(...ks.map((k) => k[1])) - pay, Math.max(...ks.map((k) => k[2])) + pay, Math.max(...ks.map((k) => k[3])) + pay];

  if (['hl', 'ul', 'st'].includes(a.tur)) {
    const ks = a.rects.map(kutu);
    const quad = ks.flatMap(([x1, y1, x2, y2]) => [x1, y2, x2, y2, x1, y1, x2, y1]);
    let ops, kaynak = {}, pay = 0;
    if (a.tur === 'hl') {
      ops = `/G0 gs ${rgb} rg ` + ks.map(([x1, y1, x2, y2]) => `${f2(x1)} ${f2(y1)} ${f2(x2 - x1)} ${f2(y2 - y1)} re f`).join(' ');
      kaynak = { ExtGState: { G0: { Type: 'ExtGState', BM: 'Multiply', ca: 0.5, CA: 0.5 } } };
    } else {
      pay = 1.5;
      ops = `${rgb} RG ` + ks.map(([x1, y1, x2, y2]) => {
        const hh = y2 - y1, lw = Math.max(0.8, hh * 0.07);
        const y = a.tur === 'ul' ? y1 + hh * 0.06 : y1 + hh * 0.48;
        return `${f2(lw)} w ${f2(x1)} ${f2(y)} m ${f2(x2)} ${f2(y)} l S`;
      }).join(' ');
    }
    return { ops, kaynak, bbox: birlesim(ks, pay), Subtype: { hl: 'Highlight', ul: 'Underline', st: 'StrikeOut' }[a.tur], ek: { QuadPoints: quad }, ca: a.tur === 'hl' ? 0.5 : 1 };
  }
  if (a.tur === 'kutu') {
    const [x1, y1, x2, y2] = kutu(a.rects[0]), lw = 1.6, y = lw / 2;
    return { ops: `${lw} w ${rgb} RG ${f2(x1 + y)} ${f2(y1 + y)} ${f2(x2 - x1 - lw)} ${f2(y2 - y1 - lw)} re S`, bbox: [x1, y1, x2, y2], Subtype: 'Square', ek: { BS: { W: lw } } };
  }
  if (a.tur === 'kalem') {
    const lw = a.kalinlik || 2, nok = a.yol.map(([x, y]) => P(x, y));
    const ops = `1 J 1 j ${lw} w ${rgb} RG ` + nok.map((p, k) => `${f2(p[0])} ${f2(p[1])} ${k ? 'l' : 'm'}`).join(' ') + ' S';
    const xs = nok.map((p) => p[0]), ys = nok.map((p) => p[1]);
    return { ops, bbox: [Math.min(...xs) - lw, Math.min(...ys) - lw, Math.max(...xs) + lw, Math.max(...ys) + lw], Subtype: 'Ink', ek: { InkList: [nok.flat().map((v) => Math.round(v * 100) / 100)], BS: { W: lw } } };
  }
  if (a.tur === 'not') {
    const [x1, y1, x2, y2] = kutu([a.x, a.y, NOT_BOYU, NOT_BOYU]), w = x2 - x1;
    const koyu = hexRgb(a.renk).map((v) => f2(v * 0.62)).join(' ');
    let ops = `${rgb} rg ${koyu} RG 0.8 w ${yuvarlakDikdortgen(x1 + 0.5, y1 + 0.5, x2 - 0.5, y2 - 0.5, 3)} B ` +
      `0.17 0.17 0.2 RG 1.3 w 1 J ${f2(x1 + w * 0.26)} ${f2(y1 + w * 0.64)} m ${f2(x1 + w * 0.74)} ${f2(y1 + w * 0.64)} l S ${f2(x1 + w * 0.26)} ${f2(y1 + w * 0.46)} m ${f2(x1 + w * 0.62)} ${f2(y1 + w * 0.46)} l S ${f2(x1 + w * 0.26)} ${f2(y1 + w * 0.28)} m ${f2(x1 + w * 0.5)} ${f2(y1 + w * 0.28)} l S`;
    let bbox = [x1, y1, x2, y2], kaynak = {};
    if (mod === 'gom' && a.metin) { // sayfaya gömülünce not yazısı yanında kutu olarak durur
      const res = yaziResmi(a.metin, { boyut: 9, arka: '#fffbe6', enFazla: 190 });
      const img = await pdfDoc.embedPng(res.png);
      // Kutu sayfadan taşmasın: sağa sığmazsa nota göre sola, oraya da sığmazsa altına konur
      const [sx1, sy1, sx2] = sinir;
      let ix = x2 + 4, iy = y2 - res.h;
      if (ix + res.w > sx2 - 4) ix = x1 - 4 - res.w;
      if (ix < sx1 + 4) { ix = Math.max(sx1 + 4, Math.min(x1, sx2 - 4 - res.w)); iy = y1 - 4 - res.h; }
      if (iy < sy1 + 4) iy = sy1 + 4;
      ops += ` q ${f2(res.w)} 0 0 ${f2(res.h)} ${f2(ix)} ${f2(iy)} cm /Im0 Do Q`;
      kaynak = { XObject: { Im0: img.ref } };
      bbox = [Math.min(x1, ix), Math.min(y1, iy), Math.max(x2, ix + res.w), Math.max(y2, iy + res.h)];
    }
    return { ops, kaynak, bbox, Subtype: 'Text', ek: { Name: 'Comment', Open: false } };
  }
  if (a.tur === 'yazi') {
    const res = yaziResmi(a.metin, { boyut: a.boyut || 13, renk: a.renk, enFazla: a.genislik ? a.genislik - 2 : null });
    const img = await pdfDoc.embedPng(res.png);
    const [x1, y1, x2, y2] = kutu([a.x - 1, a.y - 1, res.w, res.h]);
    return { ops: `q ${f2(x2 - x1)} 0 0 ${f2(y2 - y1)} ${f2(x1)} ${f2(y1)} cm /Im0 Do Q`, kaynak: { XObject: { Im0: img.ref } }, bbox: [x1, y1, x2, y2], Subtype: 'FreeText', ek: { DA: PDFLib.PDFString.of('/Helv 12 Tf 0 g'), BS: { W: 0 } } };
  }
  throw new Error('Bilinmeyen işaret türü: ' + a.tur);
}

// Sayfanın eski içeriğini q…Q arasına alır: eski içerik çizim durumunu değiştirmiş olsa da gömülen işaretler doğru yere düşer.
function icerikSarmala(pdfDoc, page) {
  const { PDFName, PDFArray } = PDFLib, ctx = pdfDoc.context;
  const ham = page.node.get(PDFName.of('Contents'));
  if (!ham) return;
  const coz = ctx.lookup(ham);
  const dizi = coz instanceof PDFArray ? coz.asArray() : [ham];
  page.node.set(PDFName.of('Contents'), ctx.obj([ctx.register(ctx.stream('q')), ...dizi, ctx.register(ctx.stream('Q'))]));
}

async function pdfeYaz(b, mod) {
  const { PDFDocument, PDFName, PDFString, PDFHexString, pushGraphicsState, popGraphicsState, drawObject } = PDFLib;
  await belgeYukle(b);
  const pdfDoc = await PDFDocument.load(b.bytes, { updateMetadata: false });
  const ctx = pdfDoc.context;
  const sayfalar = [...new Set(b.isaretler.map((a) => a.sayfa))].sort((x, y) => x - y);
  for (const i of sayfalar) {
    const page = pdfDoc.getPage(i);
    const vp = (await b.pdf.getPage(i + 1)).getViewport({ scale: 1 });
    const P = (x, y) => vp.convertToPdfPoint(x, y);
    const k1 = P(0, 0), k2 = P(vp.width, vp.height);
    const sinir = [Math.min(k1[0], k2[0]), Math.min(k1[1], k2[1]), Math.max(k1[0], k2[0]), Math.max(k1[1], k2[1])];
    if (mod === 'gom') icerikSarmala(pdfDoc, page);
    for (const a of b.isaretler.filter((x) => x.sayfa === i)) {
      const g = await gorunumHazirla(pdfDoc, a, P, mod, sinir);
      const ap = ctx.register(ctx.stream(g.ops, { Type: 'XObject', Subtype: 'Form', BBox: g.bbox, Resources: g.kaynak || {} }));
      if (mod === 'gom') {
        const ad = page.node.newXObject('EM', ap);
        page.pushOperators(pushGraphicsState(), drawObject(ad), popGraphicsState());
        continue;
      }
      const sozluk = ctx.obj({
        Type: 'Annot', Subtype: g.Subtype, Rect: g.bbox, F: 4, C: hexRgb(a.renk), CA: g.ca ?? 1,
        NM: PDFString.of('em-' + a.id), M: PDFString.of(pdfTarih(a.zaman)),
        T: PDFHexString.fromText(a.yazar || ''), Contents: PDFHexString.fromText(a.metin || a.alinti || ''),
        AP: { N: ap }, ...g.ek,
      });
      const veri = { ...a };
      sozluk.set(PDFName.of('EMVeri'), PDFHexString.fromText(JSON.stringify(veri)));
      page.node.addAnnot(ctx.register(sozluk));
    }
  }
  // Nesne akışları kapalı: işaretlerin /EMVeri alanı dosyada açıkça aranabilsin (yeniden açınca bulunur).
  return pdfDoc.save({ useObjectStreams: false });
}

// Dosya açılırken: daha önce Evrak Masası'nın "düzenlenebilir" kaydettiği işaretleri ayıklar.
// İşaretler PDF'ten çıkarılıp düzenlenebilir listeye alınır; ekranda iki kez çizilmezler.
function baytAra(bytes, metin) {
  const k = [...metin].map((c) => c.charCodeAt(0)), n = bytes.length - k.length;
  outer: for (let i = 0; i <= n; i++) {
    if (bytes[i] !== k[0]) continue;
    for (let j = 1; j < k.length; j++) if (bytes[i + j] !== k[j]) continue outer;
    return true;
  }
  return false;
}
async function isaretleriAyikla(b) {
  if (!baytAra(b.bytes, '/EMVeri')) return;
  const { PDFDocument, PDFName, PDFDict } = PDFLib;
  try {
    const pdfDoc = await PDFDocument.load(b.bytes, { updateMetadata: false });
    let n = 0;
    pdfDoc.getPages().forEach((pg, i) => {
      const dizi = pg.node.Annots();
      if (!dizi) return;
      for (let k = dizi.size() - 1; k >= 0; k--) {
        const d = pdfDoc.context.lookup(dizi.get(k));
        if (!(d instanceof PDFDict)) continue;
        const v = d.get(PDFName.of('EMVeri'));
        if (!v) continue;
        try {
          const m = JSON.parse(v.decodeText());
          m.sayfa = i;
          b.isaretler.push(m);
          dizi.remove(k); n++;
        } catch { /* bozuk veri: işaret PDF'te kalır */ }
      }
    });
    if (n) b.bytes = await pdfDoc.save({ useObjectStreams: false });
  } catch (e) { console.warn('İşaretler okunamadı:', e); }
}

// ---- Kaydet / Excel ----
async function isaretleriKaydet(b = Belgeler.etkin, mod = I.kayitModu) {
  if (!b) return;
  if (b.sifreli) return bildirim('Şifreli PDF’e işaret kaydedilemez. Şifresiz bir kopyasıyla çalışın.', { tur: 'hata' });
  if (!b.isaretler.length) return bildirim('Kaydedilecek işaret yok.', { tur: 'bilgi' });
  let bytes;
  try {
    Uygulama.mesgul('Kaydediliyor…');
    bytes = await pdfeYaz(b, mod);
  } catch (e) {
    console.error(e);
    return bildirim('Kaydedilemedi: ' + (e.message || e), { tur: 'hata' });
  } finally { Uygulama.mesgul(false); }
  const ad = mod === 'gom' ? b.ad.replace(/\.pdf$/i, '') + '_son.pdf' : b.ad;
  const sonuc = await dosyaKaydet(bytes, ad, 'pdf');
  if (sonuc == null) return;
  if (mod === 'duzen') b.degisti = false;
  Uygulama.ciz();
  bildirim(`Kaydedildi: ${sonuc}`);
}

async function excelAktar() {
  const belgeler = Belgeler.liste.filter((b) => b.isaretler.length || b.digerNotlar?.length);
  if (!belgeler.length) return bildirim('Aktarılacak not yok.', { tur: 'bilgi' });
  const satirlar = [];
  for (const b of belgeler) {
    const ust = (a) => a.rects ? a.rects[0][1] : a.yol ? a.yol[0][1] : a.y;
    [...b.isaretler].sort((x, y) => x.sayfa - y.sayfa || ust(x) - ust(y))
      .forEach((a) => satirlar.push([b.ad, a.sayfa + 1, TURLER[a.tur][0], a.alinti || '', a.metin || '', a.yazar || '', zamanYaz(a.zaman)]));
    (b.digerNotlar || []).forEach((d) => satirlar.push([b.ad, d.sayfa + 1, d.tur + ' (önceden)', '', d.metin, d.yazar, '']));
  }
  const blob = xlsxYaz('Notlar', [['Dosya', 'metin', 34], ['Sayfa', 'sayi', 8], ['Tür', 'metin', 14], ['İşaretli yazı', 'metin', 44], ['Açıklama', 'metin', 50], ['Yazan', 'metin', 16], ['Tarih', 'metin', 17]], satirlar);
  const temel = Belgeler.klasor || (belgeler.length === 1 ? belgeler[0].ad.replace(/\.pdf$/i, '') : 'Belgeler');
  const sonuc = await dosyaKaydet(blob, `${temel}_notlar.xlsx`, 'xlsx');
  if (sonuc) bildirim(`${satirlar.length} not Excel’e aktarıldı`);
}

const Isaret = {
  I, ARACLAR, RENKLER, TURLER, olaylariKur, cubukKur, cubukGizle, katmanCiz, tumKatmanlariCiz, panelNotlar, panelAlt,
  geriAl, ileriAl, isaretSil, secimdenIsaret, isaretleriKaydet, excelAktar, digerNotlariYukle,
  yaziBoyutu(adim, deger) {
    const b = Belgeler.etkin, a = b?.isaretler.find((x) => x.id === I.secili && x.tur === 'yazi');
    if (!a) return;
    const yeni = deger ?? (adim > 0 ? YAZI_BOYUTLARI.find((v) => v > a.boyut) : [...YAZI_BOYUTLARI].reverse().find((v) => v < a.boyut));
    if (!yeni || yeni === a.boyut) return;
    kayitNoktasi(b);
    a.boyut = yeni; b.degisti = true;
    I.yaziBoyutu = yeni; depo.yaz('yaziBoyutu', yeni);
    Uygulama.ciz();
  },
  genislikSifirla(id) {
    const b = Belgeler.etkin, a = b?.isaretler.find((x) => x.id === id);
    if (!a) return;
    kayitNoktasi(b); delete a.genislik; b.degisti = true; Uygulama.ciz();
  },
  aracSec(k) {
    const sel = getSelection();
    // Seç aracında yazı seçiliyken H/U/S/N: seçimi doğrudan işaretle
    if (I.arac === 'sec' && ['hl', 'ul', 'st', 'not'].includes(k) && sel && !sel.isCollapsed && sel.anchorNode?.parentElement?.closest('.vscroll .textLayer')) {
      secimdenIsaret(k); return;
    }
    I.arac = k; I.secili = null; cubukGizle(); Uygulama.ciz();
  },
  renkSec(renk) {
    const b = Belgeler.etkin, a = b?.isaretler.find((x) => x.id === I.secili);
    if (a) { kayitNoktasi(b); a.renk = renk; b.degisti = true; I.renkler[a.tur] = renk; }
    else if (I.arac !== 'sec') I.renkler[I.arac] = renk;
    depo.yaz('renkler', I.renkler);
    Uygulama.ciz();
  },
  etkinRenk() {
    const a = Belgeler.etkin?.isaretler.find((x) => x.id === I.secili);
    return a ? a.renk : I.arac === 'sec' ? null : I.renkler[I.arac];
  },
};
