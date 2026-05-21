import JSZip from 'jszip';
import type { SupplierEnglish } from './supplier-types';

// PPTX XML namespace helpers
const LATIN = `<a:latin typeface="맑은 고딕" panose="020B0503020000020004" pitchFamily="50" charset="-127"/>`;
const PPR = `<a:pPr><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>`;

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Standard content paragraph (11pt Malgun Gothic) */
function para(text: string, bold = false): string {
  const b = bold ? ' b="1"' : '';
  return `<a:p>${PPR}<a:r><a:rPr lang="en-US" altLang="ko-KR" sz="1100"${b} dirty="0">${LATIN}</a:rPr><a:t>${escXml(text)}</a:t></a:r></a:p>`;
}

/** Company name paragraph (larger, bold, no explicit sz → inherits theme) */
function namePara(text: string): string {
  return `<a:p>${PPR}<a:r><a:rPr lang="en-US" altLang="ko-KR" b="1" dirty="0">${LATIN}</a:rPr><a:t>${escXml(text)}</a:t></a:r></a:p>`;
}

/** Packaging type line with checkbox */
function checkboxPara(label: string, checked: boolean): string {
  const char = checked ? '☑' : '☐';
  return (
    `<a:p>${PPR}` +
    `<a:r><a:rPr lang="ko-KR" altLang="en-US" sz="1100" dirty="0">${LATIN}</a:rPr><a:t>  </a:t></a:r>` +
    `<a:r><a:rPr lang="ko-KR" altLang="en-US" sz="1100" dirty="0"/><a:t>${char}</a:t></a:r>` +
    `<a:r><a:rPr lang="en-US" altLang="ko-KR" sz="1100" dirty="0">${LATIN}</a:rPr><a:t> ${escXml(label)}</a:t></a:r>` +
    `</a:p>`
  );
}

/**
 * Replace all paragraphs inside a named text box's txBody.
 * Preserves bodyPr and lstStyle; replaces only the <a:p> elements.
 */
function replaceTxBody(xml: string, shapeName: string, newParas: string[]): string {
  const marker = `name="${shapeName}"`;
  const markerIdx = xml.indexOf(marker);
  if (markerIdx === -1) return xml;

  const txBodyOpen = '<p:txBody>';
  const txBodyClose = '</p:txBody>';
  const txStart = xml.indexOf(txBodyOpen, markerIdx);
  const txEnd = xml.indexOf(txBodyClose, txStart) + txBodyClose.length;
  if (txStart === -1 || txEnd === -1) return xml;

  const inner = xml.slice(txStart + txBodyOpen.length, txEnd - txBodyClose.length);

  // Keep bodyPr — may be self-closing OR have child elements (e.g. <a:spAutoFit/>)
  // Regex approach fails on nested self-closing tags, so use index search
  const bodyPr = extractBodyPr(inner);

  // Keep lstStyle
  const lstStyleMatch = inner.match(/<a:lstStyle\s*\/>/);
  const lstStyle = lstStyleMatch ? lstStyleMatch[0] : '<a:lstStyle/>';

  const newTxBody = `${txBodyOpen}${bodyPr}${lstStyle}${newParas.join('')}${txBodyClose}`;
  return xml.slice(0, txStart) + newTxBody + xml.slice(txEnd);
}

/** Build the modified slide XML for one supplier */
function buildSlideXml(templateXml: string, s: SupplierEnglish): string {
  let xml = templateXml;

  // TextBox 22: Company name + location (e.g. "Dalgubeol Myungjia (Gyeongsan)")
  const title = s.locationEn ? `${s.nameEn} (${s.locationEn})` : s.nameEn;
  xml = replaceTxBody(xml, 'TextBox 22', [namePara(title)]);

  // TextBox 4: Business career
  xml = replaceTxBody(xml, 'TextBox 4', [
    para('1) Business career', true),
    para(`√ ${s.businessCareerEn}`),
  ]);

  // TextBox 5: Sales revenue
  xml = replaceTxBody(xml, 'TextBox 5', [
    para('2) 25y sales revenue', true),
    para('√ Packaged meat: TBD'),
    para('√ Part meat: TBD'),
  ]);

  // TextBox 6: GMV
  xml = replaceTxBody(xml, 'TextBox 6', [
    para('3) 25y total GMV', true),
    para(`√ ${s.businessScaleEn}`),
  ]);

  // TextBox 1: Operate Cate
  xml = replaceTxBody(xml, 'TextBox 1', [
    para(`4) Operate Cate(total ${s.raw.totalSku} SKU)`, true),
    ...s.mainCateLines.map(l => para(l)),
  ]);

  // TextBox 7: Other OEM
  xml = replaceTxBody(xml, 'TextBox 7', [
    para('5) Other OEM', true),
    para(`√ ${s.otherOemEn}`),
  ]);

  // TextBox 8: Packaging types (checkboxes)
  xml = replaceTxBody(xml, 'TextBox 8', [
    para('6) Diversity of Packaging Types', true),
    checkboxPara('Pouch', s.raw.hasPouch),
    checkboxPara('Top sealing', s.raw.hasTopSeal),
    checkboxPara('MAP', s.raw.hasMap),
    checkboxPara('Skin', s.raw.hasSkin),
    checkboxPara('Multivac', s.raw.hasMultivac),
  ]);

  // TextBox 9: Capacity
  xml = replaceTxBody(xml, 'TextBox 9', [
    para('7) Capacity', true),
    para(`√ ${s.capaEn}`),
    para('√ Full capa – TBD'),
    para('√ Spare capa – TBD'),
  ]);

  // TextBox 10: Raw material standards
  const avgPct = s.raw.rawMaterialPct > 0 ? `${s.raw.rawMaterialPct.toFixed(1)}%` : 'TBD';
  xml = replaceTxBody(xml, 'TextBox 10', [
    para('8) raw material standards(Fresh condition)', true),
    para(`√ ${s.raw.totalSku} SKU(s) – direct import`),
    para(`- Avg. slaughter ~ FC :  ${avgPct}`),
  ]);

  // TextBox 2: Raw material supply control
  xml = replaceTxBody(xml, 'TextBox 2', [
    para('9) raw material supply control', true),
    ...s.rawMaterialSupplyLines.map(l => para(l)),
  ]);

  return xml;
}

/** Extract the full <a:bodyPr> element from txBody inner XML (handles children) */
function extractBodyPr(inner: string): string {
  const start = inner.indexOf('<a:bodyPr');
  if (start === -1) return '';
  const openEnd = inner.indexOf('>', start);
  if (openEnd === -1) return '';
  if (inner[openEnd - 1] === '/') {
    return inner.slice(start, openEnd + 1); // self-closing
  }
  const closeTag = '</a:bodyPr>';
  const closeIdx = inner.indexOf(closeTag, openEnd);
  return closeIdx !== -1 ? inner.slice(start, closeIdx + closeTag.length) : '';
}

const SLIDE_REL =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
  '</Relationships>';

const SLIDE_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.slide+xml';

const SLIDE_REL_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';

export async function generateSupplierPptx(
  suppliers: SupplierEnglish[],
  templateBuffer: ArrayBuffer
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer);

  // Extract slide1.xml as template
  const slide1File = zip.file('ppt/slides/slide1.xml');
  if (!slide1File) throw new Error('template.pptx missing slide1.xml');
  const templateSlideXml = await slide1File.async('string');

  // Build output zip from scratch using original as base
  const outZip = new JSZip();

  // Copy everything except existing slides and their rels
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const isOldSlide = /^ppt\/slides\/slide\d+\.xml$/.test(path);
    const isOldSlideRel = /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(path);
    if (isOldSlide || isOldSlideRel) continue;
    const data = await file.async('arraybuffer');
    outZip.file(path, data, { binary: true });
  }

  const n = suppliers.length;

  // Add supplier slides
  for (let i = 0; i < n; i++) {
    const slideNum = i + 1;
    const slideXml = buildSlideXml(templateSlideXml, suppliers[i]);
    outZip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);
    outZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, SLIDE_REL);
  }

  // Update [Content_Types].xml
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml = await ctFile.async('string');
    // Remove old slide overrides
    ctXml = ctXml.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, '');
    // Add new slide overrides before </Types>
    const newOverrides = Array.from({ length: n }, (_, i) =>
      `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="${SLIDE_CONTENT_TYPE}"/>`
    ).join('');
    ctXml = ctXml.replace('</Types>', `${newOverrides}</Types>`);
    outZip.file('[Content_Types].xml', ctXml);
  }

  // Update ppt/_rels/presentation.xml.rels
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (presRelsFile) {
    let relsXml = await presRelsFile.async('string');
    // Remove old slide relationships
    relsXml = relsXml.replace(
      new RegExp(`<Relationship[^>]*Type="${SLIDE_REL_TYPE}"[^>]*/>`,'g'),
      ''
    );
    // Add new slide relationships before </Relationships>
    const slideRels = Array.from({ length: n }, (_, i) =>
      `<Relationship Id="rId${i + 2}" Type="${SLIDE_REL_TYPE}" Target="slides/slide${i + 1}.xml"/>`
    ).join('');
    relsXml = relsXml.replace('</Relationships>', `${slideRels}</Relationships>`);
    outZip.file('ppt/_rels/presentation.xml.rels', relsXml);
  }

  // Update presentation.xml sldIdLst
  const presFile = zip.file('ppt/presentation.xml');
  if (presFile) {
    let presXml = await presFile.async('string');
    // Replace sldIdLst content
    const sldIdEntries = Array.from({ length: n }, (_, i) =>
      `<p:sldId id="${1000 + i}" r:id="rId${i + 2}"/>`
    ).join('');
    presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIdEntries}</p:sldIdLst>`);
    outZip.file('ppt/presentation.xml', presXml);
  }

  const buffer = await outZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return buffer;
}
