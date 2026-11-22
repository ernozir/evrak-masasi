# Evrak Masası

Muhasebe ofisleri için **internete yüklemeden** PDF görüntüleme ve işaretleme aracı.
“Vergide Yapay Zekâ” eğitim serisinin ikinci aracıdır (ilki: Mükellef Kasası).

- **Tek tıkla yüklenir:** Chrome ya da Edge'den kendi simgesi ve penceresiyle bir uygulama gibi yüklenir. İsterseniz tek dosyalık sürümü (`Evrak-Masasi.html`) çift tıklayarak da açabilirsiniz.
- **İnternet gerekmez:** Yüklendikten sonra internetsiz çalışır; gerekli her şey programın içindedir.
- **Dosyalarınız bilgisayarınızdan çıkmaz:** PDF'ler hiçbir sunucuya gönderilmez, tüm işlemler tarayıcının içinde yapılır.

## Kurulum: uygulama olarak yükleyin (önerilen)

1. Chrome ya da Edge ile **https://ernozir.github.io/evrak-masasi/** adresini açın.
2. Başlangıç ekranındaki **Uygulama olarak yükle** düğmesine (ya da adres çubuğunun sağındaki yükle simgesine) tıklayın.
3. Evrak Masası kendi simgesiyle Masaüstüne / Başlat menüsüne (Windows) ya da Uygulamalar klasörüne ve Dock'a (macOS) eklenir, kendi penceresinde açılır.

- Yüklendikten sonra **internet olmadan da açılır.**
- Yeni sürüm çıktığında, internet varken bir sonraki açılışta **kendiliğinden güncellenir.**
- Yüklü programla PDF açabilirsiniz: dosyaya sağ tıklayın → **Birlikte aç → Evrak Masası.**
- Program sayfası GitHub'dan bir kez yüklenir; açtığınız PDF'ler yine **hiçbir yere gönderilmez**, bilgisayarınızda işlenir.

İnternete hiç bağlanmak istemeyen bilgisayarlar için tek dosyalık sürüm de var: `dist/Evrak-Masasi.html` dosyasını indirip çift tıklayın.

## Kullanım

1. Bir PDF'i ya da bütün bir klasörü pencereye sürükleyin (veya **Dosya aç / Klasör aç**).
2. Klasör açtıysanız dosyalar alttaki şeritte listelenir; **Alt + ← / →** ile dosyalar arasında geçebilirsiniz.

### Sürüm 0.1'de neler var?

| Özellik | Açıklama |
|---|---|
| Görüntüleme | Sayfa küçük resimleri, yakınlaştırma, sayfaya sığdırma, sayfayı resim olarak kaydetme |
| Klasör / çoklu dosya | Alt şeritte dosya listesi, arama, sıralama, her dosyada kaç işaret olduğu |
| Arama | Belgedeki yazıda arama (tutar, unvan, VKN…), sonuçlar sayfa sayfa |
| İşaretleme | Vurgula, altını çiz, üstünü çiz, not, kalem, kutu, yazı; 6 renk |
| Notlar paneli | Tüm işaretler sayfaya göre listelenir; kim, ne zaman, işaretlenen yazı, açıklama |
| Kaydetme | **Düzenlenebilir** (Acrobat, Edge, Mac Önizleme'de not olarak görünür; Evrak Masası'nda yeniden açınca düzenlenebilir) ya da **Sayfaya göm** (kalıcı) |
| Excel | Klasördeki tüm notları tek Excel dosyasına aktarma |

Yazıyı seçip **H** tuşuna basmak onu hemen vurgular. Tüm kısayollar için programda **F1**.

### Bilinen sınırlar

- Şifreli PDF'ler açılabilir ama üzerine işaret kaydedilemez.
- Taranmış (yalnızca resimden oluşan) sayfalarda yazı seçilemez; vurgu dikdörtgen olarak çizilir.
- Başka programlarla eklenmiş notlar görüntülenir ve listelenir, ama burada değiştirilemez.
- Chrome ve Edge'de denenmiştir. Safari ve Firefox'ta denenmedi.

## Geliştirme

```bash
node derle.js        # src/ + lib/ → dist/Evrak-Masasi.html (tek dosya) ve docs/ (GitHub Pages, yüklenebilir uygulama)
```

- `docs/`: GitHub Pages'te yayınlanan sürüm. `index.html` + `manifest.webmanifest` (ad, simgeler, PDF ile açma) + `sw.js` (çevrimdışı çalışma; yalnızca programın kendi dosyalarını önbelleğe alır). GitHub'da **Settings → Pages → Branch: main, /docs** seçilir.
- `src/pwa/`: uygulama bilgileri, çevrimdışı betik ve simgeler (`araclar/ikon-uret.js` ile `ikon.svg`'den üretilir).

- `src/` kaynak dosyalar (ayrı ayrı okunabilsin diye), `lib/` kütüphaneler, `derle.js` hepsini tek dosyada birleştirir.
- Program çift tıklanarak (`file://`) açıldığı için pdf.js özel bir yolla yüklenir; ayrıntı `src/js/motor.js` başında.
- `test/fikstur.js` uydurma belgeler üretir (Örnek Tekstil, VKN 4820193576). `test/e2e.js` programı uçtan uca dener, `test/pwa.js` yüklenebilirliği ve çevrimdışı açılmayı dener.

## Lisanslar

- [pdf.js](https://github.com/mozilla/pdf.js) 4.10.38 — Apache-2.0 (`lib/LICENSE-pdfjs.txt`)
- [pdf-lib](https://github.com/Hopding/pdf-lib) 1.17.1 — MIT (`lib/LICENSE-pdf-lib.md`)
- `zipwrite.js`, `xlsxwrite.js` Mükellef Kasası'ndan alınmıştır.

## Sorumluluk

Bu araç eğitim amacıyla hazırlanmıştır. Önemli belgelerde işlem yapmadan önce yedek alın; sonuçları kontrol etme sorumluluğu kullanıcıya aittir.
