'use strict';
// Küçük ortak yardımcılar: seçiciler, biçimlendirme, bildirim, pencere, kaydetme.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const trKucuk = (s) => String(s ?? '').toLocaleLowerCase('tr-TR');
const siralayici = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });

function boyutYaz(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1048576).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MB';
}
function zamanYaz(ms) {
  const d = new Date(ms), p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
const kisaZaman = (ms) => zamanYaz(ms).replace(/\.\d{4}/, '');

// Tarayıcının yerel deposu: yalnızca küçük tercihler (tema, ad). Erişilemezse varsayılan döner.
const depo = {
  al(k, v) { try { const x = localStorage.getItem('evrak.' + k); return x == null ? v : JSON.parse(x); } catch { return v; } },
  yaz(k, v) { try { localStorage.setItem('evrak.' + k, JSON.stringify(v)); } catch { /* özel pencere vb. */ } },
};

let bildirimZamani;
function bildirim(mesaj, { tur = 'ok', geriAl = null } = {}) {
  const t = $('#toast');
  t.className = 'toast show ' + tur;
  t.innerHTML = `${ic(tur === 'hata' ? 'alert' : tur === 'bilgi' ? 'info' : 'check')}<span>${esc(mesaj)}</span>${geriAl ? '<button>Geri al</button>' : ''}`;
  if (geriAl) t.querySelector('button').onclick = () => { geriAl(); t.classList.remove('show'); };
  clearTimeout(bildirimZamani);
  bildirimZamani = setTimeout(() => t.classList.remove('show'), tur === 'hata' ? 6500 : 3500);
}

function indir(blob, ad) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = ad;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 15000);
}

const KAYIT_TURLERI = {
  pdf: { description: 'PDF belgesi', accept: { 'application/pdf': ['.pdf'] } },
  xlsx: { description: 'Excel çalışma kitabı', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } },
  png: { description: 'PNG resmi', accept: { 'image/png': ['.png'] } },
};
// Tarayıcı izin veriyorsa "Farklı kaydet" penceresi açılır (yer ve ad seçilir); yoksa İndirilenler'e iner.
// Vazgeçilirse null döner.
async function dosyaKaydet(veri, onerilenAd, tur = 'pdf') {
  const blob = veri instanceof Blob ? veri : new Blob([veri], { type: Object.keys(KAYIT_TURLERI[tur].accept)[0] });
  if (window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: onerilenAd, types: [KAYIT_TURLERI[tur]] });
      const w = await h.createWritable();
      await w.write(blob); await w.close();
      return h.name;
    } catch (e) {
      if (e.name === 'AbortError') return null;
      console.warn('Kaydetme penceresi açılamadı, indirmeye geçiliyor:', e);
    }
  }
  indir(blob, onerilenAd);
  return onerilenAd;
}

// Basit pencere (modal). dugmeler: [{yazi, birincil, deger}] → tıklanan düğmenin değeriyle çözülür; Esc = null.
function pencere({ baslik, icerik, dugmeler = [{ yazi: 'Tamam', birincil: true, deger: true }], genislik = 440, odak }) {
  return new Promise((coz) => {
    const sc = document.createElement('div');
    sc.className = 'scrim modal-scrim';
    sc.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="width:${genislik}px">
      <div class="mhead"><b>${esc(baslik)}</b><button class="tbtn mx" aria-label="Kapat">${ic('x')}</button></div>
      <div class="mbody">${icerik}</div>
      <div class="mfoot">${dugmeler.map((d, i) => `<button class="btn ${d.birincil ? 'primary' : ''} ${d.tehlike ? 'danger' : ''}" data-i="${i}">${esc(d.yazi)}</button>`).join('')}</div></div>`;
    document.body.appendChild(sc);
    // deger bir işlevse pencere kapanmadan önce çağrılır (form alanlarını okumak için)
    const sonuc = (d) => (typeof d.deger === 'function' ? d.deger(sc) : d.deger);
    const kapat = (v) => { sc.remove(); document.removeEventListener('keydown', tus, true); coz(v); };
    const tus = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); kapat(null); }
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { const d = dugmeler.find((x) => x.birincil); if (d) { e.preventDefault(); e.stopPropagation(); kapat(sonuc(d)); } }
    };
    document.addEventListener('keydown', tus, true);
    sc.addEventListener('click', (e) => {
      if (e.target === sc || e.target.closest('.mx')) return kapat(null);
      const b = e.target.closest('[data-i]');
      if (b) kapat(sonuc(dugmeler[+b.dataset.i]));
    });
    const o = odak ? sc.querySelector(odak) : sc.querySelector('.btn.primary');
    if (o) setTimeout(() => o.focus(), 0);
  });
}
