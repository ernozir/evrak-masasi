'use strict';
// Uygulama kabuğu: başlık çubuğu, sekmeler, araç şeridi, Başlangıç ekranı, ayarlar, yardım,
// komut paleti, kısayollar ve olay dağıtımı.

const SURUM = 'v0.1';
const D = { arac: 'giris', tema: depo.al('tema', 'sistem'), palet: false };

const ARAC_SERIDI = [
  { id: 'giris', ad: 'Başlangıç', ikon: 'home' },
  { ayrac: true },
  { id: 'goruntule', ad: 'Görüntüle', ikon: 'eye' },
];

function temaUygula() {
  const koyu = D.tema === 'koyu' || (D.tema === 'sistem' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = koyu ? 'dark' : 'light';
}

function cerceveCiz() {
  $('#logo').innerHTML = ic('logo');
  const b = Belgeler.etkin;
  $('#tabs').innerHTML = `<button class="tab ${D.arac === 'giris' ? 'on' : ''}" data-sekmeye="giris">${ic('home')}<span>Başlangıç</span></button>` +
    (b ? `<button class="tab ${D.arac !== 'giris' ? 'on' : ''}" data-sekmeye="belge" title="${esc(b.yol)}">${ic('file')}<span>${esc(b.ad)}</span>${b.degisti ? '<i class="dot" title="Kaydedilmemiş işaret"></i>' : ''}<i class="x" data-act="belgeKapat" title="Belgeyi kapat">${ic('x')}</i></button>` : '') +
    `<button class="tab add" data-act="dosyaAc" title="Dosya aç (Ctrl+O)">${ic('plus')}</button>`;
  $('#rail').innerHTML = ARAC_SERIDI.map((t) => t.ayrac ? '<div class="rsep"></div>' : `<button class="rbtn ${D.arac === t.id ? 'on' : ''}" data-arac-git="${t.id}" title="${t.ad}">${ic(t.ikon)}<span>${t.ad}</span></button>`).join('') +
    `<div class="grow"></div><button class="rbtn" data-act="yardim" title="Yardım (F1)">${ic('help')}<span>Yardım</span></button><button class="rbtn" data-act="ayarlar" title="Ayarlar">${ic('settings')}<span>Ayarlar</span></button>`;
  temaUygula();
  $('[data-act="tema"]').innerHTML = ic(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');
}

function duzen(mod) {
  const c = $('#content');
  c.className = 'content ' + (mod || '');
  if (mod === 'full') $('#center').classList.remove('vsplit');
}
function durum(parcalar) {
  $('#status').innerHTML = `${parcalar || ''}<span class="sp"></span><span class="safe">${ic('lock')}Dosyalarınız bu bilgisayardan çıkmaz</span><span>${SURUM}</span>`;
}

function girisCiz() {
  duzen('full');
  $('#toolbar').innerHTML = `<h1>Başlangıç</h1><span class="tspace"></span><button class="tb" data-act="yardim">${ic('help')}Nasıl kullanılır?</button>`;
  const acik = Belgeler.liste;
  const KARTLAR = [
    ['dosyaAc', 'Görüntüle ve işaretle', 'PDF açın; vurgulayın, not alın, altını çizin', 'eye', '#0ea5e9'],
    ['klasorAc', 'Klasördeki belgeleri gez', 'Bir klasörü açın, dosyalar arasında tek tıkla geçin', 'folder', '#0d9488'],
  ];
  $('#center').innerHTML = `<div class="home">
    <div class="hero"><div><h2>Bugün ne yapmak istersiniz?</h2><p>Bir dosyayı ya da klasörü bu pencereye sürükleyin veya aşağıdan seçin.</p></div>${Kurulum.yuklenebilir ? `<button class="btn" data-act="yukle" title="Masaüstüne, Başlat menüsüne ya da Dock'a kendi simgesiyle eklenir; internetsiz de açılır">${ic('save')}Uygulama olarak yükle</button>` : ''}</div>
    <div class="bigdrop"><div class="ic">${ic('upload')}</div><div><b>PDF dosyalarını ya da bir klasörü buraya bırakın</b><span>Birden çok dosya seçebilirsiniz · Klasördeki PDF olmayan dosyalar atlanır</span></div><div class="sp"></div>
      <button class="btn" data-act="klasorAc">${ic('folder')}Klasör aç</button><button class="btn primary" data-act="dosyaAc">${ic('file')}Dosya aç</button></div>
    <div class="tasks">${KARTLAR.map((k) => `<button class="task" data-act="${k[0]}"><div class="ti" style="background:${k[4]}">${ic(k[3])}</div><b>${k[1]}</b><small>${k[2]}</small></button>`).join('')}</div>
    <div class="cols">
      <div class="card"><h4>${acik.length ? `Açık belgeler · ${acik.length}` : 'Açık belge yok'}</h4>
        ${acik.length ? `<table class="recent">${acik.slice(0, 12).map((b) => `<tr data-belge="${b.id}" class="tikla" title="${esc(b.yol)}"><td><div class="fi">${ic('file')}<b class="ad">${esc(b.ad)}</b>${b.degisti ? '<i class="kd" title="Kaydedilmemiş"></i>' : ''}</div></td><td class="m">${b.sayfaSayisi ? b.sayfaSayisi + ' sayfa · ' : ''}${boyutYaz(b.boyut)}</td><td class="m">${b.isaretler.length ? b.isaretler.length + ' işaret' : '<span class="yok">—</span>'}</td></tr>`).join('')}</table>${acik.length > 12 ? `<p class="hint" style="padding:0 16px 12px">ve ${acik.length - 12} dosya daha</p>` : ''}`
          : `<p class="hint" style="padding:0 16px 16px;margin:0">Açtığınız dosyalar burada listelenir. Program dosyaları kendisi saklamaz; kapatınca liste boşalır.</p>`}</div>
      <div class="card"><h4>Güvenli çalışma</h4><div class="trust">
        <div>${ic('lock')}<span>Dosyalar hiçbir sunucuya yüklenmez; tüm işlemler bu bilgisayarda yapılır.</span></div>
        <div>${ic('shield')}<span>${Kurulum.web ? 'Uygulama olarak yüklendikten sonra internet bağlantısı gerekmez.' : 'İnternet bağlantısı gerekmez. Program tek bir dosyadır, kurulum istemez.'}</span></div>
        <div>${ic('save')}<span>Kaydettiğinizde nereye kaydedileceğini siz seçersiniz; asıl dosya kendiliğinden değişmez.</span></div>
      </div></div>
    </div></div>`;
  durum(acik.length ? `<span><b>${acik.length}</b> açık belge</span>` : '');
}

function ciz() {
  cerceveCiz();
  if (D.arac === 'giris') girisCiz();
  else Goruntule.ciz();
}

async function belgeAc(b) {
  if (Belgeler.etkin && Belgeler.etkin !== b) {
    const eski = Belgeler.etkin;
    // Kaydedilmemiş işareti olmayan eski belge bellekten bırakılır (resimleri kalır)
    if (!eski.degisti && !eski.isaretler.length) { belgeBosalt(eski); eski.bytes = null; }
  }
  Belgeler.etkin = b;
  D.arac = 'goruntule';
  G.sayfa = 0;
  G.arama = b.arama || (b.arama = Goruntule.bosArama()); // her belgenin araması kendinde kalır
  Isaret.I.secili = null;
  ciz();
}

async function belgeKapat(b = Belgeler.etkin) {
  if (!b) return;
  if (!(await kaydedilmemisOnay([b]))) return;
  const i = Belgeler.liste.indexOf(b);
  Belgeler.liste.splice(i, 1);
  belgeBosalt(b);
  if (!Belgeler.liste.length) { Belgeler.etkin = null; Belgeler.klasor = null; D.arac = 'giris'; G.kurulan = null; return ciz(); }
  belgeAc(Belgeler.liste[Math.min(i, Belgeler.liste.length - 1)]);
}

let mesgulSayac = 0;
function mesgul(mesaj) {
  const m = $('#mesgul');
  if (mesaj) { mesgulSayac++; m.querySelector('span').textContent = mesaj; m.classList.add('on'); }
  else if (--mesgulSayac <= 0) { mesgulSayac = 0; m.classList.remove('on'); }
}

// ---- Pencereler ----
async function ayarlar() {
  const r = await pencere({
    baslik: 'Ayarlar',
    icerik: `<div class="field"><label>Adınız</label><input class="inp" id="ayarAd" value="${esc(depo.al('yazar', ''))}" placeholder="Ör. Ayşe Yılmaz" maxlength="40"><div class="hint">Eklediğiniz notlarda “yazan” olarak görünür.</div></div>
      <div class="field"><label>Tema</label><div class="seg" id="ayarTema">${[['acik', 'Açık'], ['koyu', 'Koyu'], ['sistem', 'Sistemle aynı']].map((t) => `<button type="button" class="${D.tema === t[0] ? 'on' : ''}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div></div>`,
    dugmeler: [{ yazi: 'Vazgeç', deger: null }, { yazi: 'Kaydet', birincil: true, deger: (k) => ({ ad: k.querySelector('#ayarAd').value.trim(), tema: k.querySelector('#ayarTema .on').dataset.t }) }],
    odak: '#ayarAd',
  });
  if (!r) return;
  depo.yaz('yazar', r.ad);
  D.tema = r.tema; depo.yaz('tema', r.tema);
  ciz();
  bildirim('Ayarlar kaydedildi');
}
document.addEventListener('click', (e) => { // ayarlar penceresindeki tema düğmeleri
  const t = e.target.closest('#ayarTema [data-t]');
  if (!t) return;
  $$('#ayarTema button').forEach((x) => x.classList.toggle('on', x === t));
});

function yardim() {
  const satir = (k, a) => `<tr><td>${a}</td><td>${k.split(' ').map((x) => `<kbd>${x}</kbd>`).join(' ')}</td></tr>`;
  pencere({
    baslik: 'Evrak Masası · Yardım',
    genislik: 560,
    icerik: `<p>PDF dosyalarınızı internete yüklemeden, bu bilgisayarda görüntüleyip işaretlemenizi sağlar. Program tek bir HTML dosyasıdır; çift tıklayınca tarayıcıda açılır.</p>
      <table class="ktab">${[
        ['Ctrl O', 'Dosya aç'], ['Ctrl K', 'Komut ara'], ['Ctrl S', 'İşaretleri kaydet'], ['Ctrl F', 'Belgede ara'],
        ['V', 'Seç'], ['H', 'Vurgula (yazı seçiliyse hemen vurgular)'], ['U', 'Altını çiz'], ['S', 'Üstünü çiz'], ['N', 'Not ekle'], ['P', 'Kalem'], ['B', 'Kutu'], ['T', 'Yazı'],
        ['Delete', 'Seçili işareti sil'], ['Ctrl Z', 'Geri al'], ['Ctrl Y', 'Yinele'], ['Esc', 'Seçime dön'],
        ['PageUp PageDown', 'Önceki / sonraki sayfa'], ['Alt ← Alt →', 'Önceki / sonraki dosya'], ['Ctrl + Ctrl −', 'Yakınlaştır / uzaklaştır'], ['Ctrl 0', 'Sayfaya sığdır'],
      ].map(([k, a]) => satir(k, a)).join('')}</table>
      <p class="hint">${SURUM} · “Vergide Yapay Zekâ” eğitim serisi için hazırlanmıştır. Açık kaynak bileşenler: pdf.js (Mozilla, Apache-2.0), pdf-lib (MIT).</p>`,
    dugmeler: [{ yazi: 'Kapat', birincil: true, deger: true }],
  });
}

// ---- Komut paleti ----
const KOMUTLAR = () => [
  ['Dosya', 'Dosya aç', 'file', 'Ctrl O', () => dosyaSec()],
  ['Dosya', 'Klasör aç', 'folder', '', () => dosyaSec({ klasor: true })],
  ['Dosya', 'İşaretleri kaydet', 'save', 'Ctrl S', () => Isaret.isaretleriKaydet()],
  ['Dosya', 'Notları Excel’e aktar', 'sheetx', '', () => Isaret.excelAktar()],
  ['Dosya', 'Bu sayfayı resim olarak kaydet', 'image', '', () => Goruntule.gorselKaydet()],
  ['Dosya', 'Belgeyi kapat', 'x', '', () => belgeKapat()],
  ...Isaret.ARACLAR.map((t) => ['İşaretle', t[1], t[2], t[3], () => { D.arac = 'goruntule'; Isaret.aracSec(t[0]); }]),
  ['Görünüm', 'Belgede ara', 'search', 'Ctrl F', () => aramayaOdaklan()],
  ['Görünüm', 'Sonraki dosya', 'arrow', 'Alt →', () => Goruntule.dosyaDegistir(1)],
  ['Görünüm', 'Önceki dosya', 'arrow', 'Alt ←', () => Goruntule.dosyaDegistir(-1)],
  ['Görünüm', 'Yakınlaştır', 'plus', 'Ctrl +', () => Goruntule.yakinlastir(1)],
  ['Görünüm', 'Uzaklaştır', 'minus', 'Ctrl −', () => Goruntule.yakinlastir(-1)],
  ['Görünüm', 'Sayfa genişliğine sığdır', 'fit', 'Ctrl 0', () => Goruntule.sigdir()],
  ['Görünüm', 'Sayfalar panelini aç / kapat', 'sidebar', '', () => EYLEMLER.solPanel()],
  ['Görünüm', 'Sağ paneli (notlar, arama) aç / kapat', 'sidebar', '', () => EYLEMLER.sagPanel()],
  ['Görünüm', 'Açık / koyu tema', 'moon', '', () => temaDegistir()],
  ...(Kurulum.yuklenebilir ? [['Program', 'Uygulama olarak yükle', 'save', '', () => Kurulum.yukle()]] : []),
  ['Program', 'Ayarlar', 'settings', '', () => ayarlar()],
  ['Program', 'Yardım ve kısayollar', 'help', 'F1', () => yardim()],
  ['Program', 'Başlangıç', 'home', '', () => { D.arac = 'giris'; ciz(); }],
].filter((k) => Belgeler.etkin || k[0] === 'Dosya' && /aç/.test(k[1]) || k[0] === 'Program' || k[1].includes('tema'));

let paletSira = 0, paletSorgu = '';
function paletAc() {
  document.querySelector('.scrim.palet')?.remove();
  D.palet = true; paletSira = 0; paletSorgu = '';
  const sc = document.createElement('div');
  sc.className = 'scrim palet';
  sc.innerHTML = `<div class="palette"><div class="pin">${ic('search')}<input placeholder="Ne yapmak istiyorsunuz? (ör. vurgula, klasör, Excel)"><kbd>Esc</kbd></div><div class="plist"></div></div>`;
  document.body.appendChild(sc);
  const inp = sc.querySelector('input'), liste = KOMUTLAR();
  let suzulmus = liste;
  const kapat = () => { sc.remove(); D.palet = false; };
  const ciz_ = () => {
    const q = trKucuk(paletSorgu);
    suzulmus = liste.filter((c) => trKucuk(c[1] + ' ' + c[0]).includes(q));
    paletSira = Math.min(paletSira, Math.max(0, suzulmus.length - 1));
    let g = '';
    sc.querySelector('.plist').innerHTML = suzulmus.map((c, i) => { const h = c[0] !== g ? `<div class="pgrp">${c[0]}</div>` : ''; g = c[0]; return h + `<div class="pitem ${i === paletSira ? 'on' : ''}" data-ci="${i}">${ic(c[2])}<span>${c[1]}</span>${c[3] ? `<kbd>${c[3]}</kbd>` : ''}</div>`; }).join('') || '<div class="pgrp">Sonuç yok</div>';
    sc.querySelector('.pitem.on')?.scrollIntoView({ block: 'nearest' });
  };
  const calistir = (c) => { kapat(); c && c[4](); };
  ciz_(); inp.focus();
  inp.addEventListener('input', () => { paletSorgu = inp.value; paletSira = 0; ciz_(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { paletSira = Math.min(suzulmus.length - 1, paletSira + 1); ciz_(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { paletSira = Math.max(0, paletSira - 1); ciz_(); e.preventDefault(); }
    if (e.key === 'Enter') calistir(suzulmus[paletSira]);
    if (e.key === 'Escape') kapat();
  });
  sc.addEventListener('click', (e) => { const it = e.target.closest('.pitem'); if (it) calistir(suzulmus[+it.dataset.ci]); else if (e.target === sc) kapat(); });
}

function temaDegistir() {
  D.tema = document.documentElement.dataset.theme === 'dark' ? 'acik' : 'koyu';
  depo.yaz('tema', D.tema);
  ciz();
}
function aramayaOdaklan() {
  if (!Belgeler.etkin?.pdf) return;
  D.arac = 'goruntule'; G.sagSekme = 'ara'; G.sagAcik = true; ciz();
  setTimeout(() => { const i = $('#aramaKutusu'); i?.focus(); i?.select(); }, 0);
}

// ---- Olaylar ----
const EYLEMLER = {
  dosyaAc: () => dosyaSec(), dosyaEkle: () => dosyaSec(), klasorAc: () => dosyaSec({ klasor: true }),
  tema: temaDegistir, palet: paletAc, ayarlar, yardim, belgeKapat: () => belgeKapat(), yukle: () => Kurulum.yukle(),
  oncekiSayfa: () => Goruntule.sayfayaGit(Math.max(0, G.sayfa - 1)),
  sonrakiSayfa: () => Goruntule.sayfayaGit(Math.min(Belgeler.etkin.sayfaSayisi - 1, G.sayfa + 1)),
  oncekiDosya: () => Goruntule.dosyaDegistir(-1), sonrakiDosya: () => Goruntule.dosyaDegistir(1),
  yakinlas: () => Goruntule.yakinlastir(1), uzaklas: () => Goruntule.yakinlastir(-1), sigdir: () => Goruntule.sigdir(),
  serit: () => { G.seritAcik = !G.seritAcik; depo.yaz('seritAcik', G.seritAcik); Seritler.guncelle(); Goruntule.altHizala(); },
  solPanel: () => { G.solAcik = !G.solAcik; depo.yaz('solAcik', G.solAcik); ciz(); },
  sagPanel: () => { G.sagAcik = !G.sagAcik; depo.yaz('sagAcik', G.sagAcik); ciz(); },
  aramaOnceki: () => Goruntule.aramaSonucunaGit(G.arama.aktif - 1),
  aramaSonraki: () => Goruntule.aramaSonucunaGit(G.arama.aktif + 1),
  kaydet: () => Isaret.isaretleriKaydet(), excel: () => Isaret.excelAktar(), gorselKaydet: () => Goruntule.gorselKaydet(),
};

function olaylariKur() {
  document.addEventListener('click', (e) => {
    const ic_ = e.target.closest('a.bag[data-ic]');
    if (ic_) { e.preventDefault(); return Goruntule.icBaglanti(ic_); }
    const yg = e.target.closest('[data-ygenislik]');
    if (yg) return Isaret.genislikSifirla(yg.dataset.ygenislik);
    const yb = e.target.closest('[data-yboy]');
    if (yb) return Isaret.yaziBoyutu(+yb.dataset.yboy);
    const t = e.target.closest('[data-act],[data-arac-git],[data-sekmeye],[data-belge],[data-goto],[data-arac],[data-renk],[data-sekme],[data-nflt],[data-kmod],[data-isil],[data-sonuc],[data-aid]');
    if (!t || t.closest('.modal')) return;
    const d = t.dataset;
    if (d.act) { e.stopPropagation(); return EYLEMLER[d.act]?.(); }
    if (d.aracGit) { D.arac = d.aracGit; return ciz(); }
    if (d.sekmeye) { D.arac = d.sekmeye === 'giris' ? 'giris' : 'goruntule'; return ciz(); }
    if (d.belge) { const b = Belgeler.liste.find((x) => x.id === +d.belge); if (b) belgeAc(b); return; }
    if (d.goto !== undefined) return Goruntule.sayfayaGit(+d.goto);
    if (d.arac) return Isaret.aracSec(d.arac);
    if (d.renk) return Isaret.renkSec(d.renk);
    if (d.sekme) { G.sagSekme = d.sekme; return Goruntule.panelCiz(); }
    if (d.nflt) { Isaret.I.filtre = d.nflt; return Goruntule.panelCiz(); }
    if (d.kmod) { Isaret.I.kayitModu = d.kmod; depo.yaz('kayitModu', d.kmod); return Goruntule.panelCiz(); }
    if (d.isil) return Isaret.isaretSil(Belgeler.etkin, d.isil);
    if (d.sonuc !== undefined) return Goruntule.aramaSonucunaGit(+d.sonuc);
    if (d.aid && t.closest('#insp')) { // not listesinde bir işarete tıklandı
      // panelin içindeki düğme, liste ve yazı alanları paneli yeniden çizdirmesin (açılır liste kapanıyordu)
      if (e.target.closest('textarea,button,select,input,option,.yboy')) return;
      const b = Belgeler.etkin, a = b?.isaretler.find((x) => x.id === d.aid);
      if (!a) return;
      Isaret.I.secili = a.id;
      Isaret.tumKatmanlariCiz(b); Goruntule.panelCiz();
      const sc = $('.vscroll'), el = sc?.querySelector(`.sayfa[data-i="${a.sayfa}"]`);
      if (el) {
        const ust = a.rects ? a.rects[0][1] : a.yol ? a.yol[0][1] : a.y;
        sc.scrollTo({ top: el.offsetTop + ust * G.olcek - sc.clientHeight / 3, behavior: 'smooth' });
      }
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.metin) { // not / yazı açıklaması
      const b = Belgeler.etkin, a = b?.isaretler.find((x) => x.id === t.dataset.metin);
      if (!a) return;
      if (!t._kayitAlindi) { t._kayitAlindi = true; b.geriAl.push(JSON.stringify(b.isaretler)); b.ileriAl = []; }
      a.metin = t.value; b.degisti = true;
      const el = $(`.vscroll .sayfa[data-i="${a.sayfa}"]`);
      if (el) Isaret.katmanCiz(b, el);
      cerceveCiz();
    }
    if (t.id === 'aramaKutusu') Goruntule.aramaGirdisi(t.value);
    if (t.id === 'seritAra') { G.seritAra = t.value; Seritler.guncelle(); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'seritSira') { G.seritSira = t.value; Seritler.guncelle(); }
    if (t.dataset.yboyut) Isaret.yaziBoyutu(0, +t.value);
    if (t.id === 'sayfaNo') { const n = parseInt(t.value, 10); if (n >= 1 && n <= Belgeler.etkin.sayfaSayisi) Goruntule.sayfayaGit(n - 1); else t.value = G.sayfa + 1; }
  });
  // Yazı alanından çıkınca panel yenilenir; ama fare basılıyken (ör. bir düğmeye tıklanıyorken) yenilenirse
  // tıklanan düğme yok olur ve tıklama boşa gider. Bu yüzden fare bırakıldıktan sonra yenilenir.
  let fareBasili = false;
  document.addEventListener('pointerdown', () => { fareBasili = true; }, true);
  document.addEventListener('pointerup', () => { fareBasili = false; }, true);
  document.addEventListener('focusout', (e) => {
    if (!e.target.dataset?.metin) return;
    e.target._kayitAlindi = false;
    const yenile = () => { if (!document.activeElement?.dataset?.metin) Goruntule.panelCiz(); };
    if (fareBasili) document.addEventListener('click', () => setTimeout(yenile, 0), { once: true });
    else yenile();
  });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.modal')) return;
    const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (ctrl && k === 'k') { e.preventDefault(); return paletAc(); }
    if (D.palet) return;
    if (ctrl && k === 'o') { e.preventDefault(); return dosyaSec(); }
    if (e.key === 'F1') { e.preventDefault(); return yardim(); }
    const yaziyor = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.target.id === 'aramaKutusu' && e.key === 'Enter') { e.preventDefault(); return Goruntule.aramaSonucunaGit(G.arama.aktif + (e.shiftKey ? -1 : 1)); }
    if (yaziyor) { if (e.key === 'Escape') document.activeElement.blur(); return; }
    const b = Belgeler.etkin;
    if (D.arac !== 'goruntule' || !b?.pdf) return;
    if (ctrl && k === 's') { e.preventDefault(); return Isaret.isaretleriKaydet(); }
    if (ctrl && k === 'f') { e.preventDefault(); return aramayaOdaklan(); }
    if (ctrl && k === 'z') { e.preventDefault(); return e.shiftKey ? Isaret.ileriAl() : Isaret.geriAl(); }
    if (ctrl && k === 'y') { e.preventDefault(); return Isaret.ileriAl(); }
    if (ctrl && (k === '+' || k === '=')) { e.preventDefault(); return Goruntule.yakinlastir(1); }
    if (ctrl && k === '-') { e.preventDefault(); return Goruntule.yakinlastir(-1); }
    if (ctrl && k === '0') { e.preventDefault(); return Goruntule.sigdir(); }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); return Goruntule.dosyaDegistir(1); }
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); return Goruntule.dosyaDegistir(-1); }
    if (ctrl || e.altKey) return;
    if (e.key === 'PageDown') { e.preventDefault(); return EYLEMLER.sonrakiSayfa(); }
    if (e.key === 'PageUp') { e.preventDefault(); return EYLEMLER.oncekiSayfa(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && Isaret.I.secili) { e.preventDefault(); return Isaret.isaretSil(b, Isaret.I.secili); }
    if (e.key === 'Escape') { if (Isaret.I.arac !== 'sec' || Isaret.I.secili) { Isaret.I.secili = null; Isaret.aracSec('sec'); } getSelection()?.removeAllRanges(); Isaret.cubukGizle(); return; }
    const arac = Isaret.ARACLAR.find((t) => t[3].toLowerCase() === k);
    if (arac) { e.preventDefault(); Isaret.aracSec(arac[0]); }
  });

  // Ctrl + tekerlek: yakınlaştır
  addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey) || !e.target.closest?.('.vscroll')) return;
    e.preventDefault();
    clearTimeout(olaylariKur._t);
    olaylariKur._t = setTimeout(() => Goruntule.yakinlastir(e.deltaY < 0 ? 1 : -1), 60);
  }, { passive: false });

  let boyutZamani;
  addEventListener('resize', () => { clearTimeout(boyutZamani); boyutZamani = setTimeout(() => { if (D.arac === 'goruntule') { if (G.sigdir) ciz(); else Goruntule.altHizala(); } }, 180); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (D.tema === 'sistem') ciz(); });
  addEventListener('beforeunload', (e) => { if (Belgeler.liste.some((b) => b.degisti)) { e.preventDefault(); e.returnValue = ''; } });
}

const Uygulama = { ciz, duzen, durum, mesgul, panelCiz: () => Goruntule.panelCiz() };

// ---- Başlat ----
(async function baslat() {
  $('.cmdk-i').outerHTML = ic('search');
  $('.off-i').outerHTML = ic('shield');
  temaUygula();
  Kurulum.baslat();
  olaylariKur();
  birakmaKur();
  Isaret.cubukKur();
  ciz();
  try { await Motor.hazir; }
  catch (e) { console.error(e); bildirim('PDF motoru başlatılamadı. Lütfen Chrome ya da Edge ile açın.', { tur: 'hata' }); }
})();
