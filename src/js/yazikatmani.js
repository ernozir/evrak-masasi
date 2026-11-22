'use strict';
// Görünmez yazı katmanını gerçek harflere oturtma.
//
// Sorun: pdf.js yazı katmanında her parçayı (çoğu zaman bütün bir satırı) tarayıcının yedek yazı
// tipiyle yazar ve parçanın genişliğine esnetir. Sayfadaki yazı tipi farklı olduğundan (ör. Word
// çıktısında Times) satırın ortasındaki kelimeler birkaç piksel kayar: çift tıklayınca kelimenin
// ilk harfi seçilmez, arama vurgusu kayar.
//
// Çözüm: pdf.js'in sayfayı çizerken kullandığı komutlardan (getOperatorList) her harfin sayfadaki
// gerçek başlangıç/bitiş noktası hesaplanır; satırdaki her kelime ve boşluk, kendi genişliğine
// esnetilmiş ayrı bir kutuya (<b>) konur. Böylece görünmez kelime tam gerçek kelimenin üstüne düşer.
// Hesap tutmayan parçalara dokunulmaz (pdf.js'in standart hâli kalır).

const YaziKatmani = (() => {
  const carp = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const uygula = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const BIRIM = [1, 0, 0, 1, 0, 0];

  // Sayfadaki her harfin konumu (PDF birimi, sayfa koordinatı): [{u, x1, x2, y}]
  async function harfler(page) {
    const OPS = Motor.lib.OPS;
    const ol = await page.getOperatorList();
    const out = [];
    let d = { ctm: BIRIM, tm: BIRIM, x: 0, y: 0, lx: 0, ly: 0, fs: 0, yon: 1, cs: 0, ws: 0, hs: 1, lead: 0 };
    const yigin = [];
    const sakla = () => yigin.push({ ...d });
    const geri = () => { if (yigin.length) d = yigin.pop(); };
    const tasi = (x, y) => { d.lx += x; d.ly += y; d.x = d.lx; d.y = d.ly; };
    for (let k = 0; k < ol.fnArray.length; k++) {
      const fn = ol.fnArray[k], a = ol.argsArray[k];
      switch (fn) {
        case OPS.save: sakla(); break;
        case OPS.restore: geri(); break;
        case OPS.transform: d.ctm = carp(d.ctm, a); break;
        case OPS.paintFormXObjectBegin: sakla(); if (Array.isArray(a[0]) && a[0].length === 6) d.ctm = carp(d.ctm, a[0]); break;
        case OPS.paintFormXObjectEnd: geri(); break;
        case OPS.beginText: d.tm = BIRIM; d.x = d.y = d.lx = d.ly = 0; break;
        case OPS.setTextMatrix: d.tm = (a.length === 6 ? a : a[0]).slice(); d.x = d.y = d.lx = d.ly = 0; break;
        case OPS.moveText: tasi(a[0], a[1]); break;
        case OPS.setLeadingMoveText: d.lead = -a[1]; tasi(a[0], a[1]); break;
        case OPS.setLeading: d.lead = -a[0]; break;
        case OPS.nextLine: tasi(0, d.lead); break;
        case OPS.setFont: { const s = a[1]; d.fs = Math.abs(s); d.yon = s < 0 ? -1 : 1; break; }
        case OPS.setCharSpacing: d.cs = a[0]; break;
        case OPS.setWordSpacing: d.ws = a[0]; break;
        case OPS.setHScale: d.hs = a[0] / 100; break;
        case OPS.showText: {
          const m = carp(d.ctm, d.tm);
          let xl = 0;
          for (const g of a[0]) {
            if (typeof g === 'number') { xl -= (g * d.fs) / 1000; continue; }
            if (!g) continue;
            const gen = (g.width * d.fs) / 1000 + ((g.isSpace ? d.ws : 0) + d.cs) * d.yon;
            const bas = uygula(m, d.x + xl * d.hs * d.yon, d.y), son = uygula(m, d.x + (xl + gen) * d.hs * d.yon, d.y);
            if (g.unicode) out.push({ u: g.unicode, x1: bas[0], x2: son[0], y: bas[1], dik: Math.abs(m[1]) > 1e-3 || Math.abs(m[2]) > 1e-3 });
            xl += gen;
          }
          d.x += xl * d.hs * d.yon;
          break;
        }
        default: break;
      }
    }
    return out;
  }

  const bosMu = (c) => /\s/.test(c);
  const norm = (s) => s.normalize('NFKC');

  // Bir yazı parçasının her karakterine harf konumu bulur: [[x1, x2], ...] ya da eşleşmezse null.
  function eslestir(item, harf, imlec) {
    const str = item.str, y = item.transform[5], boy = Math.hypot(item.transform[2], item.transform[3]) || 10;
    // parçanın ilk (boşluk olmayan) karakterini, satırı tutan harfler arasında ara
    const ilk = [...str].findIndex((c) => !bosMu(c));
    if (ilk < 0) return null;
    let g = -1;
    for (let j = imlec.i; j < Math.min(harf.length, imlec.i + 400); j++) {
      const h = harf[j];
      if (!h.dik && Math.abs(h.y - y) < boy * 0.6 && norm(h.u).startsWith(str[ilk]) && Math.abs(h.x1 - item.transform[4]) < Math.max(item.width, boy) + boy) { g = j; break; }
    }
    if (g < 0) return null;
    const kon = new Array(str.length);
    let son = null;
    // baştaki boşluklar: ilk harfin başına
    for (let c = 0; c < ilk; c++) kon[c] = [harf[g].x1, harf[g].x1];
    let c = ilk;
    while (c < str.length) {
      const h = harf[g];
      if (h && !h.dik && Math.abs(h.y - y) < boy * 0.6) {
        const u = norm(h.u);
        if (str.startsWith(u, c) && u.length) {
          for (let k = 0; k < u.length; k++) kon[c + k] = [h.x1 + ((h.x2 - h.x1) * k) / u.length, h.x1 + ((h.x2 - h.x1) * (k + 1)) / u.length];
          c += u.length; g++; son = h; continue;
        }
        if (bosMu(u) && !bosMu(str[c])) { g++; continue; } // PDF'te boşluk var, parçada yok
      }
      if (bosMu(str[c]) && son) { kon[c] = [son.x2, son.x2]; c++; continue; } // pdf.js'in eklediği boşluk
      return null; // tutmadı
    }
    imlec.i = g;
    return kon;
  }

  let olcer = null;
  function genislik(metin, font) {
    olcer ||= document.createElement('canvas').getContext('2d');
    if (olcer.font !== font) olcer.font = font;
    return olcer.measureText(metin).width;
  }

  // TextLayer çizildikten sonra çağrılır.
  async function hizala(page, tc, katman, vp) {
    if (vp.rotation % 360) return 0;
    let harf;
    try { harf = await harfler(page); } catch (e) { console.warn('Harf konumları alınamadı', e); return 0; }
    if (!harf.length) return 0;
    const divler = katman.textDivs, ogeler = tc.items.filter((it) => it.str !== undefined);
    if (!divler || divler.length !== ogeler.length) return 0;
    const imlec = { i: 0 };
    let n = 0;
    for (let k = 0; k < ogeler.length; k++) {
      const it = ogeler[k], sp = divler[k];
      if (!it.str || it.str.length < 2 || !sp?.isConnected) continue;
      if (Math.abs(it.transform[1]) > 1e-3 || Math.abs(it.transform[2]) > 1e-3 || it.transform[0] <= 0) continue; // yalnız düz yatay yazı
      if (sp.style.transform && !/^scaleX\([^)]*\)$/.test(sp.style.transform.trim())) continue;
      const kon = eslestir(it, harf, imlec);
      if (!kon) continue;
      // kelime ve boşluk dilimleri
      const dilim = [];
      for (let c = 0; c < it.str.length;) {
        const b = bosMu(it.str[c]);
        let e = c + 1;
        while (e < it.str.length && bosMu(it.str[e]) === b) e++;
        dilim.push([c, e]); c = e;
      }
      // Parçayı kelime/boşluk başına ayrı, kendi yerine konmuş kardeş parçalara böl (pdf.js'in kelime kelime
      // yazılmış PDF'lerde yaptığı gibi). Böylece çift tıklama yalnızca o kelimeyi seçer.
      const st = getComputedStyle(sp), font = `${st.fontSize} ${st.fontFamily}`;
      const sol0 = sp.style.left, s = vp.scale, x0 = it.transform[4];
      const parca = document.createDocumentFragment();
      for (const [a, z] of dilim) {
        const bas = (kon[a][0] - x0) * s, hedef = Math.max(0, (kon[z - 1][1] - kon[a][0]) * s);
        const metin = it.str.slice(a, z), dogal = genislik(metin, font) || 1;
        const yeni = sp.cloneNode(false);
        yeni.textContent = metin;
        yeni.style.left = `calc(${sol0} + ${bas.toFixed(2)}px)`;
        yeni.style.transform = `scaleX(${(hedef / dogal).toFixed(4)})`;
        yeni.dataset.hiza = '1';
        parca.append(yeni);
      }
      sp.replaceWith(parca);
      n++;
    }
    return n;
  }

  return { hizala, harfler };
})();
