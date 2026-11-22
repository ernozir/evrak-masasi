// Uçtan uca deneme: dist/Evrak-Masasi.html dosyasını file:// ile açar, uydurma klasörü yükler,
// arama, vurgulama, not, kalem, taranmış sayfada dikdörtgen vurgu, kaydetme (iki tür) ve Excel'i dener.
// Kullanım: CHR=<Chrome for Testing> PW=<playwright-core> node test/e2e.js [ekran_klasoru]
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW);
const KOK = path.join(__dirname, '..');
const KLASOR = path.join(__dirname, 'ornek', 'Ornek_Tekstil_2026-10');
const EKRAN = process.argv[2] || path.join(__dirname, 'ekran');
const INDIR = path.join(__dirname, 'cikti');
fs.mkdirSync(EKRAN, { recursive: true }); fs.rmSync(INDIR, { recursive: true, force: true }); fs.mkdirSync(INDIR, { recursive: true });

let gecti = 0, kaldi = 0;
const kontrol = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };

(async () => {
  const tarayici = await chromium.launch({ executablePath: process.env.CHR });
  const bag = await tarayici.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await bag.newPage();
  const hatalar = [];
  p.on('pageerror', (e) => hatalar.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  const ekran = (ad) => p.screenshot({ path: path.join(EKRAN, ad + '.png') });
  const bekle = (ms) => p.waitForTimeout(ms);
  const indir = async (tetik, ad) => { const [d] = await Promise.all([p.waitForEvent('download'), tetik()]); const yol = path.join(INDIR, ad || d.suggestedFilename()); await d.saveAs(yol); return yol; };

  await p.goto('file://' + path.join(KOK, 'dist', 'Evrak-Masasi.html'));
  await p.evaluate(() => Motor.hazir);
  // Testte "Farklı kaydet" penceresi açılamaz: indirmeye düşsün
  await p.evaluate(() => { window.showSaveFilePicker = undefined; localStorage.setItem('evrak.yazar', '"Muhasebe"'); });
  await ekran('01_baslangic');
  kontrol('Başlangıç ekranı açıldı', await p.isVisible('text=Bugün ne yapmak istersiniz?'));

  // Klasör aç
  const [secici] = await Promise.all([p.waitForEvent('filechooser'), p.click('.bigdrop [data-act="klasorAc"]')]);
  await secici.setFiles(KLASOR);
  await p.waitForSelector('.vscroll .sayfa[data-i="0"] canvas', { timeout: 15000 });
  await p.waitForSelector('.vscroll .sayfa[data-i="0"] .textLayer span');
  await bekle(400);
  // Klasör ada göre sıralı açılır; denemeler KDV paketiyle yapılır
  await p.click('.fcard[title*="Ekim_2026_KDV"]');
  await p.waitForFunction(() => Belgeler.etkin.ad.startsWith('Ekim') && document.querySelector('.vscroll .sayfa[data-i="0"] .textLayer span'), null, { timeout: 10000 });
  await bekle(600);
  kontrol('Klasördeki 12 PDF şeritte (txt atlandı)', (await p.$$('.fcard')).length === 12, (await p.$$('.fcard')).length);
  kontrol('İlk belge 8 sayfa', (await p.$$('.vscroll .sayfa')).length === 8);
  kontrol('Klasör adı şeritte', (await p.textContent('.fhead .crumb')).includes('Ornek_Tekstil_2026-10'));
  await p.waitForFunction(() => document.querySelectorAll('.fcard img').length >= 6, null, { timeout: 15000 }).catch(() => {});
  await p.waitForFunction(() => document.querySelectorAll('#left .thumb img').length >= 3, null, { timeout: 15000 }).catch(() => {});
  await ekran('02_klasor');

  // Arama
  await p.click('[data-sekme="ara"]');
  await p.fill('#aramaKutusu', '72.715,85');
  await p.waitForFunction(() => G.arama.sonuclar.length > 0 && !G.arama.suruyor, null, { timeout: 8000 });
  await bekle(700);
  const sonuc = await p.evaluate(() => G.arama.sonuclar.map((s) => s.sayfa));
  kontrol('Arama 2. ve 3. sayfada buldu', sonuc.includes(1) && sonuc.includes(2), JSON.stringify(sonuc));
  const hitler = await p.$$eval('.textLayer .hit', (h) => h.map((x) => x.textContent).join('|'));
  kontrol('Yalnızca aranan yazı boyandı', hitler.length > 0 && hitler.split('|').every((t) => '72.715,85'.includes(t)), hitler);
  await p.click('[data-act="aramaSonraki"]'); await bekle(600);
  kontrol('Aşağı okla sonraki sonuç', await p.evaluate(() => G.arama.aktif === 1));
  const gorunur = await p.evaluate(() => { const h = document.querySelector('.textLayer .hit.cur'); if (!h) return false; const r = h.getBoundingClientRect(), q = document.querySelector('.vscroll').getBoundingClientRect(); return r.top >= q.top && r.bottom <= q.bottom; });
  kontrol('Etkin sonuç görünür alanda', gorunur);
  kontrol('Arama kutusunda yer tutucu yazı yok', (await p.getAttribute('#aramaKutusu', 'placeholder')) === null);
  const okYeri = (await (await p.$('[data-act="aramaSonraki"]')).boundingBox()).y;
  for (let k = 0; k < 4; k++) await p.click('[data-act="aramaSonraki"]');
  await bekle(400);
  kontrol('Oklara art arda basınca düğmeler yerinde kalıyor', Math.abs((await (await p.$('[data-act="aramaSonraki"]')).boundingBox()).y - okYeri) < 1);
  await p.click('[data-sekme="bilgi"]'); await bekle(150);
  kontrol('Belge özeti ayrı Bilgi sekmesinde', (await p.textContent('#insp .scroll')).includes('Belge özeti') && !(await p.$('#aramaKutusu')));
  await p.click('[data-sekme="ara"]'); await bekle(150);
  // Sağ paneli kapat/aç; kapalıyken Ctrl+F açar
  await p.click('[data-act="sagPanel"]'); await bekle(300);
  kontrol('Sağ panel gizlendi', await p.evaluate(() => document.querySelector('#content').classList.contains('noright') && getComputedStyle(document.querySelector('#insp')).display === 'none'));
  await p.keyboard.press('Control+f'); await bekle(300);
  kontrol('Ctrl+F sağ paneli geri açtı', await p.evaluate(() => !document.querySelector('#content').classList.contains('noright')));
  await p.mouse.click(700, 300);
  await ekran('03_arama');
  // Başka dosyaya geçip dönünce arama sonuçları korunmalı
  await p.click('.fcard[title*="Fatura_ORN2026000191"]'); await bekle(500);
  await p.click('.fcard[title*="Ekim_2026_KDV"]');
  await p.waitForSelector('.vscroll .sayfa[data-i="0"] canvas'); await bekle(400);
  kontrol('Dosya değiştirip dönünce arama sonuçları duruyor', await p.evaluate(() => G.arama.q === '72.715,85' && G.arama.sonuclar.length > 0) && (await p.$$('#insp .sres button')).length > 0);
  await p.click('[data-sekme="notlar"]');

  // Vurgulama: yazının üzerinden sürükle (2. sayfa, "Ödenmesi gereken KDV")
  await p.evaluate(() => Goruntule.sayfayaGit(1, false));
  await bekle(500);
  await p.keyboard.press('h');
  const kutu = await p.evaluate(() => {
    const sp = [...document.querySelectorAll('.sayfa[data-i="1"] .textLayer span')].filter((s) => /Ödenmesi|72\.715,85/.test(s.textContent));
    const r1 = sp[0].getBoundingClientRect(), r2 = sp[sp.length - 1].getBoundingClientRect();
    return { x1: r1.left + 1, y: r1.top + r1.height / 2, x2: r2.right - 1 };
  });
  await p.mouse.move(kutu.x1, kutu.y); await p.mouse.down(); await p.mouse.move(kutu.x2, kutu.y, { steps: 8 }); await p.mouse.up();
  await bekle(300);
  let isaretler = await p.evaluate(() => Belgeler.etkin.isaretler);
  const vurgu = isaretler.find((a) => a.tur === 'hl');
  kontrol('Vurgu eklendi ve yazıya oturdu', vurgu && vurgu.sayfa === 1 && vurgu.rects.length >= 1, JSON.stringify(vurgu));
  kontrol('Vurgulanan yazı yakalandı', vurgu?.alinti?.includes('Ödenmesi gereken KDV'), vurgu?.alinti);

  // Not ekle
  await p.keyboard.press('n');
  const sayfa2 = await p.$('.sayfa[data-i="1"]');
  const sb = await sayfa2.boundingBox();
  await p.mouse.click(sb.x + sb.width * 0.88, kutu.y);
  await bekle(150);
  await p.keyboard.type('Tahakkukla karşılaştırıldı, ödeme 25.11’de.');
  await bekle(150);
  isaretler = await p.evaluate(() => Belgeler.etkin.isaretler);
  kontrol('Not eklendi ve Türkçe yazı girildi', isaretler.some((a) => a.tur === 'not' && a.metin.includes('karşılaştırıldı')));
  kontrol('Nottan sonra seçim aracına dönüldü', await p.evaluate(() => Isaret.I.arac === 'sec'));

  // Seç aracında yazı seçip seçim çubuğundan "Altını çiz"
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  const k2 = await p.evaluate(() => {
    // satır kelime kelime parçalı olabilir: "Sonraki"nin başından aynı satırdaki "KDV"nin sonuna
    const sps = [...document.querySelectorAll('.sayfa[data-i="1"] .textLayer span')];
    const bas = sps.find((s) => /^Sonraki/.test(s.textContent)), rb = bas.getBoundingClientRect();
    const son = sps.slice(sps.indexOf(bas)).find((s) => /KDV$/.test(s.textContent)), rs = son.getBoundingClientRect();
    return { x1: rb.left + 1, x2: rs.right - 1, y: rb.top + rb.height / 2 };
  });
  await p.mouse.move(k2.x1, k2.y); await p.mouse.down(); await p.mouse.move(k2.x2, k2.y, { steps: 6 }); await p.mouse.up();
  await bekle(200);
  kontrol('Seçim çubuğu göründü', await p.isVisible('#secimCubugu.on'));
  await ekran('04_secim_cubugu');
  await p.click('#secimCubugu [data-sc="ul"]');
  await bekle(200);
  isaretler = await p.evaluate(() => Belgeler.etkin.isaretler);
  kontrol('Seçim çubuğuyla altı çizildi', isaretler.some((a) => a.tur === 'ul' && a.alinti.includes('Sonraki döneme')));

  // Kalem: 4. sayfada tutarın çevresine
  await p.evaluate(() => Goruntule.sayfayaGit(3, false));
  await bekle(600);
  await p.keyboard.press('p');
  const t = await p.evaluate(() => { const s = [...document.querySelectorAll('.sayfa[data-i="3"] .textLayer span')].find((x) => /73\.286,85/.test(x.textContent)); const r = s.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, rx: r.width / 2 + 14, ry: r.height / 2 + 8 }; });
  await p.mouse.move(t.cx + t.rx, t.cy); await p.mouse.down();
  for (let k = 1; k <= 30; k++) { const a = (k / 30) * Math.PI * 2.1; await p.mouse.move(t.cx + Math.cos(a) * t.rx, t.cy + Math.sin(a) * t.ry); }
  await p.mouse.up();
  await bekle(200);
  isaretler = await p.evaluate(() => Belgeler.etkin.isaretler);
  kontrol('Kalem çizimi eklendi', isaretler.some((a) => a.tur === 'kalem' && a.yol.length > 10));
  const kalemStil = await p.$eval('.an.kalem path', (x) => { const c = getComputedStyle(x); return c.fill + ' / ' + c.stroke; });
  kontrol('Kalem ekranda çizgi olarak görünüyor (dolgu yok)', kalemStil.startsWith('none') && !kalemStil.endsWith('none'), kalemStil);
  await p.keyboard.press('Escape');
  await p.evaluate(() => Goruntule.sayfayaGit(1, false));
  await bekle(400);
  // Notu seç (açılır kutusu görünsün) ve ekran
  await p.click('#insp .nitem:has-text("Not")');
  await bekle(500);
  await ekran('05_isaretler');
  kontrol('Not seçiliyken de kaydet bölümü şeritle aynı hizada', await p.evaluate(() => Math.abs(document.querySelector('.fstrip').getBoundingClientRect().top - document.querySelector('#insp .foot').getBoundingClientRect().top) <= 1));

  // Ara sekmesi açıkken sayfadaki bir işarete tıklayınca Notlar'da o işaret seçili görünmeli
  await p.click('[data-sekme="ara"]'); await bekle(150);
  await p.click('[data-nflt]').catch(() => {});
  await p.evaluate(() => Goruntule.sayfayaGit(1, false)); await bekle(300);
  const hlYer = await p.evaluate(() => { const r = [...document.querySelectorAll('.sayfa[data-i="1"] .an.hl > i')].map((x) => x.getBoundingClientRect()).sort((x, y) => x.left - y.left)[0]; return { x: r.left + 6, y: r.top + r.height / 2 }; });
  await p.mouse.click(hlYer.x, hlYer.y); await bekle(250);
  kontrol('Sayfadaki işarete tıklayınca Notlar sekmesine geçti', await p.evaluate(() => G.sagSekme === 'notlar' && !!document.querySelector('#insp .nitem.on')));
  await p.click('[data-nflt="cizim"]'); await bekle(150);
  await p.click('.sayfa[data-i="1"] .an.ul > i'); await bekle(250);
  kontrol('Filtre gizliyorsa Tümü’ne dönüp işareti gösterdi', await p.evaluate(() => Isaret.I.filtre === 'tum' && !!document.querySelector('#insp .nitem.on')));

  // Sağ panel kapalıyken sayfadaki bir işarete tıklayınca panel açılmalı ve işaret Notlar'da seçili olmalı
  await p.click('[data-act="sagPanel"]'); await bekle(400);
  const kapaliHl = await p.evaluate(() => { const r = [...document.querySelectorAll('.sayfa[data-i="1"] .an.hl > i')].map((x) => x.getBoundingClientRect()).sort((x, y) => x.left - y.left)[0]; return { x: r.left + 6, y: r.top + r.height / 2 }; });
  await p.mouse.click(kapaliHl.x, kapaliHl.y); await bekle(400);
  kontrol('Panel kapalıyken işarete tıklayınca panel açıldı ve not seçili', await p.evaluate(() => G.sagAcik && G.sagSekme === 'notlar' && !!document.querySelector('#insp .nitem.on')));

  // Geri al / yinele
  const once = isaretler.length;
  await p.mouse.click(700, 300); // odağı panelden al
  await p.keyboard.press('Control+z');
  const sonra = await p.evaluate(() => Belgeler.etkin.isaretler.length);
  await p.keyboard.press('Control+y');
  const yine = await p.evaluate(() => Belgeler.etkin.isaretler.length);
  kontrol('Geri al ve yinele', sonra === once - 1 && yine === once, `${once}/${sonra}/${yine}`);

  // Düzenlenebilir kaydet
  const duzenYol = await indir(() => p.click('[data-act="kaydet"]'), 'duzenlenebilir.pdf');
  kontrol('Düzenlenebilir PDF indi', fs.statSync(duzenYol).size > 1000);
  kontrol('Kaydedince "kaydedilmemiş" işareti kalktı', await p.evaluate(() => !Belgeler.etkin.degisti));

  // Sayfaya göm
  await p.click('[data-kmod="gom"]');
  const gomYol = await indir(() => p.click('[data-act="kaydet"]'), 'gomulu.pdf');
  kontrol('Gömülü PDF indi', fs.statSync(gomYol).size > 1000);
  await p.click('[data-kmod="duzen"]');

  // Excel
  const xlsx = await indir(() => p.click('[data-act="excel"]'), 'notlar.xlsx');
  kontrol('Excel indi', fs.statSync(xlsx).size > 500);

  // Kutu: çiz, seçime dön, köşeden büyüt; yazı: boyutunu büyüt
  await p.evaluate(() => Goruntule.sayfayaGit(2, false)); await bekle(400);
  await p.mouse.click(700, 300);
  await p.keyboard.press('b');
  const s3 = await (await p.$('.sayfa[data-i="2"]')).boundingBox();
  const kx = s3.x + s3.width * 0.15, ky = Math.max(s3.y, 130) + 120;
  await p.mouse.move(kx, ky); await p.mouse.down(); await p.mouse.move(kx + 160, ky + 60, { steps: 5 }); await p.mouse.up(); await bekle(250);
  kontrol('Kutudan sonra seçim aracına dönüldü', await p.evaluate(() => Isaret.I.arac === 'sec'));
  kontrol('Seçili kutuda sayfa köşesinde çerçeve (kare) yok', await p.evaluate(() => [...document.querySelectorAll('.an.grp.sel')].every((x) => getComputedStyle(x).outlineStyle === 'none')));
  const kutuOnce = await p.evaluate(() => Belgeler.etkin.isaretler.find((a) => a.tur === 'kutu').rects[0][2]);
  const tutamac = await (await p.$('.tut[data-tut="se"]')).boundingBox();
  await p.mouse.move(tutamac.x + 3, tutamac.y + 3); await p.mouse.down(); await p.mouse.move(tutamac.x + 83, tutamac.y + 43, { steps: 5 }); await p.mouse.up(); await bekle(250);
  const kutuSonra = await p.evaluate(() => Belgeler.etkin.isaretler.find((a) => a.tur === 'kutu').rects[0][2]);
  kontrol('Kutu köşeden boyutlandırıldı', kutuSonra > kutuOnce + 40, `${kutuOnce} → ${kutuSonra}`);
  await p.keyboard.press('t');
  await p.mouse.click(kx, ky + 110); await bekle(200);
  await p.keyboard.type('Kontrol edildi');
  await p.mouse.click(700, 300); await bekle(100);
  await p.click('#insp .nitem:has-text("Kontrol edildi")'); await bekle(150);
  await p.click('[data-yboy="1"]'); await p.click('[data-yboy="1"]'); await bekle(150);
  kontrol('Yazı boyutu büyütüldü', await p.evaluate(() => Belgeler.etkin.isaretler.find((a) => a.tur === 'yazi').boyut === 16));
  const liste = await p.$('select[data-yboyut]');
  await liste.click(); await bekle(200);
  kontrol('Yazı boyutu listesi tıklayınca yerinde kalıyor (panel yeniden çizilmedi)', await liste.evaluate((x) => x.isConnected));
  await p.keyboard.press('Escape');
  await p.selectOption('select[data-yboyut]', '20'); await bekle(150);
  kontrol('Listeden boyut seçildi', await p.evaluate(() => Belgeler.etkin.isaretler.find((a) => a.tur === 'yazi').boyut === 20));
  // Uzun yazıyı sağ kenarından daralt: alt satırlara kaymalı
  await p.fill('textarea[data-metin]', 'Tahakkuk fişindeki tutar beyannameyle karşılaştırıldı, fark yok.');
  await p.mouse.click(700, 300); await bekle(100);
  await p.click('.an.yazi'); await bekle(150);
  const yukseklik1 = await p.$eval('.an.yazi', (x) => x.offsetHeight);
  const yk = await (await p.$('.an.yazi .tut[data-tut="e"]')).boundingBox();
  await p.mouse.move(yk.x + 3, yk.y + 3); await p.mouse.down(); await p.mouse.move(yk.x - 260, yk.y + 3, { steps: 6 }); await p.mouse.up(); await bekle(200);
  const yazi = await p.evaluate(() => Belgeler.etkin.isaretler.find((a) => a.tur === 'yazi'));
  const yukseklik2 = await p.$eval('.an.yazi', (x) => x.offsetHeight);
  kontrol('Yazı kutusu daraltılınca alt satıra kaydı', yazi.genislik > 0 && yukseklik2 > yukseklik1 * 1.6, `${yazi.genislik} / ${yukseklik1}→${yukseklik2}`);
  await p.click('#insp .yrenk [data-renk="#e11d48"]'); await bekle(150);
  kontrol('Yazı rengi panelden değişti', await p.evaluate(() => Belgeler.etkin.isaretler.find((a) => a.tur === 'yazi').renk === '#e11d48'));
  await ekran('05b_kutu_yazi');
  const hiza = await p.evaluate(() => Math.abs(document.querySelector('.fstrip').getBoundingClientRect().top - document.querySelector('#insp .foot').getBoundingClientRect().top));
  kontrol('Kaydet bölümü şeritle aynı hizada', hiza <= 1, hiza);
  await p.click('#toolbar [data-act="solPanel"]'); await bekle(300);
  kontrol('Sayfalar paneli gizlendi', await p.evaluate(() => document.querySelector('#content').classList.contains('noleft')) && (await p.$$('.vscroll .sayfa')).length > 0);
  await ekran('05c_panel_kapali');
  await p.click('#toolbar [data-act="solPanel"]'); await bekle(300);
  kontrol('Sayfalar paneli geri açıldı', await p.evaluate(() => !document.querySelector('#content').classList.contains('noleft')));

  // Bağlantılar
  await p.click('.fcard[title*="Baglantili"]');
  await p.waitForSelector('.vscroll .sayfa[data-i="0"] a.bag', { timeout: 10000 });
  const linkler = await p.$$eval('.sayfa[data-i="0"] a.bag', (l) => l.map((a) => a.getAttribute('href')));
  kontrol('Bağlantılar tıklanabilir alan olarak çizildi', linkler.includes('https://example.com/mevzuat') && linkler.includes('#'), JSON.stringify(linkler));
  await p.click('.sayfa[data-i="0"] a.bag[data-ic]'); await bekle(900);
  kontrol('Belge içi bağlantı 2. sayfaya götürdü', await p.evaluate(() => G.sayfa === 1));
  const disHedef = await p.$eval('.sayfa[data-i="0"] a.bag[target]', (a) => a.target + ' ' + a.rel);
  kontrol('Dış bağlantı yeni sekmede açılacak', disHedef.startsWith('_blank'), disHedef);
  await ekran('05d_baglanti');

  // Dosya şeridi: Alt+→ ve taranmış dosya
  const onceki = await p.evaluate(() => Belgeler.etkin.ad);
  await p.keyboard.press('Alt+ArrowRight');
  await p.waitForSelector('.vscroll .sayfa[data-i="0"] canvas', { timeout: 10000 });
  kontrol('Alt+→ sonraki dosya', (await p.evaluate(() => Belgeler.etkin.ad)) !== onceki);
  await p.click('.fcard[title*="Taranmis"]');
  await p.waitForSelector('.vscroll .sayfa[data-i="0"] canvas', { timeout: 10000 });
  await bekle(500);
  kontrol('Taranmış sayfada yazı katmanı yok', (await p.$$('.sayfa[data-i="0"] .textLayer span')).length === 0);
  await p.keyboard.press('h');
  const ts = await (await p.$('.sayfa[data-i="0"]')).boundingBox();
  await p.mouse.move(ts.x + ts.width * 0.55, ts.y + ts.height * 0.23); await p.mouse.down();
  await p.mouse.move(ts.x + ts.width * 0.92, ts.y + ts.height * 0.245, { steps: 6 }); await p.mouse.up();
  await bekle(300);
  kontrol('Taranmış sayfada dikdörtgen vurgu', await p.evaluate(() => Belgeler.etkin.isaretler.some((a) => a.tur === 'hl')));
  await p.keyboard.press('Escape');
  await ekran('06_taranmis');

  // Koyu tema
  await p.click('[data-act="tema"]');
  await bekle(300);
  await p.evaluate(() => bildirim('Deneme bildirimi'));
  await bekle(250);
  const toastRenk = await p.$eval('#toast', (t) => getComputedStyle(t).backgroundColor);
  kontrol('Koyu temada bildirim açık renkte', toastRenk === 'rgb(241, 245, 249)', toastRenk);
  await ekran('07_koyu');
  await p.click('[data-act="tema"]');

  // Komut paleti
  await p.keyboard.press('Control+k');
  await p.keyboard.type('excel');
  await bekle(150);
  kontrol('Komut paleti Excel komutunu buldu', (await p.textContent('.plist')).includes('Excel'));
  await ekran('08_palet');
  await p.keyboard.press('Escape');

  await p.click('[data-sekmeye="giris"]'); await bekle(300);
  const satirlar = await p.$$eval('.recent tr', (t) => t.map((r) => r.offsetHeight));
  kontrol('Başlangıçta açık belgeler tek satır', satirlar.length > 0 && Math.max(...satirlar) < 50, JSON.stringify(satirlar));
  kontrol('İşaretsiz belgede tire', (await p.$$('.recent .yok')).length > 0);
  await ekran('09_baslangic_acik');

  // Satırı tek parça yazılmış (Word benzeri) belge: arama vurgusu satırdaki diğer kelimelerin yerini değiştirmemeli
  const p3 = await bag.newPage({ viewport: { width: 1440, height: 900 } });
  await p3.goto('file://' + path.join(KOK, 'dist', 'Evrak-Masasi.html'));
  await p3.evaluate(() => Motor.hazir);
  const [s3x] = await Promise.all([p3.waitForEvent('filechooser'), p3.click('.bigdrop [data-act="dosyaAc"]')]);
  await s3x.setFiles(path.join(__dirname, 'ornek-ek', 'Aciklama_Notu_satir_parcali.pdf'));
  await p3.waitForSelector('.vscroll .sayfa[data-i="0"] .textLayer span'); await p3.waitForTimeout(500);
  const ithaliYeri = () => p3.evaluate(() => {
    const sp = [...document.querySelectorAll('.textLayer span')].find((x) => !x.children.length && x.textContent.includes('ithali')) || [...document.querySelectorAll('.textLayer span')].find((x) => x.textContent.includes('ithali'));
    const tw = document.createTreeWalker(sp, NodeFilter.SHOW_TEXT); let n, r = null;
    while ((n = tw.nextNode())) { const i = n.textContent.indexOf('ithali'); if (i >= 0) { const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 6); r = rg.getBoundingClientRect(); break; } }
    return r && Math.round(r.left);
  });
  const ithali1 = await ithaliYeri();
  await p3.evaluate(() => { G.sagSekme = 'ara'; Goruntule.panelCiz(); Goruntule.aramaGirdisi('prensip'); });
  await p3.waitForFunction(() => document.querySelector('.textLayer mark.hit'), null, { timeout: 5000 });
  await p3.waitForTimeout(300);
  const ithali2 = await ithaliYeri();
  kontrol('Arama vurgusu aynı satırdaki “ithali” kelimesini kaydırmadı', ithali1 != null && Math.abs(ithali1 - ithali2) <= 1, `${ithali1} → ${ithali2}`);
  // Çift tıklama: kelimenin ilk harfine tıklanınca kelimenin tamamı seçilmeli (görünmez yazı gerçek harflere oturtuldu)
  await p3.evaluate(() => Goruntule.aramaGirdisi('')); await p3.waitForTimeout(400);
  kontrol('Satır parçalı belgede kelimeler gerçek yerlerine oturtuldu', (await p3.$$('.textLayer span[data-hiza]')).length > 50);
  let ciftTam = 0; const ciftKelimeler = ['prensip', 'sayılmış', 'teslimi', 'belirtildiği', 'faaliyetler', 'ithali'];
  for (const w of ciftKelimeler) {
    const k = await p3.evaluate((w) => { const x = [...document.querySelectorAll('.textLayer span[data-hiza]')].find((s) => s.textContent === w); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + 2.5, y: r.top + r.height / 2 }; }, w);
    if (!k) continue;
    await p3.evaluate(() => getSelection().removeAllRanges()); await p3.waitForTimeout(450);
    await p3.mouse.dblclick(k.x, k.y); await p3.waitForTimeout(40);
    if ((await p3.evaluate(() => getSelection().toString().trim())) === w) ciftTam++;
  }
  kontrol('İlk harfe çift tıklayınca kelimenin tamamı seçiliyor', ciftTam === ciftKelimeler.length, `${ciftTam}/${ciftKelimeler.length}`);
  await p3.close();

  kontrol('Konsolda hata yok', hatalar.length === 0, hatalar.join(' | '));

  // Kaydedilen dosyayı yeniden aç: işaretler düzenlenebilir geri gelmeli, sayfada iki kez çizilmemeli
  const p2 = await bag.newPage();
  const h2 = [];
  p2.on('pageerror', (e) => h2.push(e.message));
  await p2.goto('file://' + path.join(KOK, 'dist', 'Evrak-Masasi.html'));
  await p2.evaluate(() => Motor.hazir);
  const [s2] = await Promise.all([p2.waitForEvent('filechooser'), p2.click('.bigdrop [data-act="dosyaAc"]')]);
  await s2.setFiles(duzenYol);
  await p2.waitForSelector('.vscroll .sayfa[data-i="0"] canvas', { timeout: 10000 });
  const geri = await p2.evaluate(() => Belgeler.etkin.isaretler.map((a) => a.tur + (a.metin ? ':' + a.metin : '')));
  kontrol('Yeniden açınca 4 işaret düzenlenebilir geldi', geri.length === 4, JSON.stringify(geri));
  kontrol('Not yazısı korunmuş (Türkçe)', geri.some((g) => g.includes('karşılaştırıldı')));
  await p2.waitForTimeout(800);
  const digerSay = await p2.evaluate(() => Belgeler.etkin.digerNotlar?.length ?? -1);
  kontrol('Kendi işaretleri "önceden olan" diye ikinci kez sayılmadı', digerSay === 0, digerSay);
  kontrol('İkinci pencerede hata yok', h2.length === 0, h2.join(' | '));

  await tarayici.close();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
