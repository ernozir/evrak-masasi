'use strict';
// PDF motoru: pdf.js dosyanın içine gömülüdür (window.PDFJS_KAYNAK / PDFJS_ISCI, derle.js ekler).
//
// Neden böyle? Program çift tıklanarak (file://) açılır. Bu adreste tarayıcı
//  - <script type="module" src="..."> ile dış dosya yüklemez,
//  - pdf.js'in işçisini (worker) "modül" olarak başlatınca sessizce takılır.
// Çözüm: pdf.js kodunu bir Blob adresinden import() ile, işçiyi ise sondaki "export" satırı
// atılmış KLASİK işçi olarak başlatmak (derle.js bu satırı atar). İnternet gerekmez.

const Motor = (() => {
  let lib = null;
  const hazir = (async () => {
    const kod = URL.createObjectURL(new Blob([window.PDFJS_KAYNAK], { type: 'text/javascript' }));
    lib = await import(kod);
    const isci = new Worker(URL.createObjectURL(new Blob([window.PDFJS_ISCI], { type: 'text/javascript' })));
    lib.GlobalWorkerOptions.workerPort = isci;
    return lib;
  })();

  // sifreSor: (yanlisMi) => Promise<string|null>. null dönerse açma iptal edilir.
  async function ac(bytes, sifreSor) {
    await hazir;
    const gorev = lib.getDocument({ data: bytes.slice(), isEvalSupported: false });
    let sifreli = false;
    gorev.onPassword = async (guncelle, neden) => {
      sifreli = true;
      const s = sifreSor ? await sifreSor(neden === lib.PasswordResponses.INCORRECT_PASSWORD) : null;
      if (s == null) { gorev.destroy(); return; }
      guncelle(s);
    };
    const pdf = await gorev.promise;
    pdf._sifreli = sifreli;
    return pdf;
  }

  return { hazir, ac, get lib() { return lib; } };
})();
