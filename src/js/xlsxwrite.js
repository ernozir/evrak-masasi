// Mükellef Kasası — tek sayfalık, en sade Excel (.xlsx) yazıcı. zipwrite.js ile paketlenir; dış kütüphane yok.
// sutunlar: [[başlık, biçim, genişlik]] biçim: "metin" | "para" (#,##0.00) | "sayi" (#,##0)
// satirlar: [[hücre…]] — boş hücre için "" ya da null. Başlık satırı kalın, dondurulmuş ve süzgeçli.

function xlsxYaz(sayfaAdi, sutunlar, satirlar) {
  const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
    // XML'de geçersiz denetim karakterleri atılır
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const harf = (i) => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
  const BICIM = { metin: 0, para: 2, sayi: 3 };
  const hucre = (deger, r, c, stil) => {
    const ref = harf(c) + r;
    if (deger == null || deger === "") return "";
    if (typeof deger === "number" && Number.isFinite(deger)) return `<c r="${ref}" s="${stil}"><v>${deger}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${stil ? ` s="${stil === 1 ? 1 : 0}"` : ""}><is><t xml:space="preserve">${xml(deger)}</t></is></c>`;
  };
  const satirXml = [`<row r="1">${sutunlar.map((s, c) => hucre(s[0], 1, c, 1)).join("")}</row>`];
  satirlar.forEach((satir, i) => {
    const r = i + 2;
    satirXml.push(`<row r="${r}">${satir.map((v, c) => hucre(v, r, c, BICIM[sutunlar[c]?.[1]] || 0)).join("")}</row>`);
  });
  const son = harf(sutunlar.length - 1) + (satirlar.length + 1);
  const ad = xml(String(sayfaAdi).replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sayfa1");

  const dosyalar = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${ad}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${ad.replace(/'/g, "''")}'!$A$1:$${son.replace(/\d+$/, "")}$${satirlar.length + 1}</definedName></definedNames></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${sutunlar.map((s, i) => `<col min="${i + 1}" max="${i + 1}" width="${Number(s[2]) || 14}" customWidth="1"/>`).join("")}</cols><sheetData>${satirXml.join("")}</sheetData><autoFilter ref="A1:${son}"/></worksheet>`
  };
  const enc = new TextEncoder();
  return zipYaz(Object.entries(dosyalar).map(([ad, metin]) => ({ ad, veri: enc.encode(metin) })));
}

if (typeof module !== "undefined") module.exports = { xlsxYaz };
