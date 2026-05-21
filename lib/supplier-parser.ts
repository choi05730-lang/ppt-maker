import * as XLSX from 'xlsx';
import type { SupplierRaw } from './supplier-types';

const TARGET_SHEET_PATTERN = /Final ver/i;

// Column indices (0-based) in the "Final ver." sheet, header row = row index 12
const COL = {
  ID: 0,
  SUPPLIER: 1,
  LOCATION: 2,
  VENDOR: 3,
  MAIN_CATE: 4,
  TOTAL_SKU: 5,
  GRADE: 8,
  TOTAL_SCORE: 9,
  ONE_LINE: 10,
  BUSINESS_SCALE: 12,
  BUSINESS_CAREER: 14,
  OTHER_OEM: 17,
  PACKING_TYPE: 19,
  CAPA: 21,
  RAW_MATERIAL_SCORE: 23,
  RAW_MATERIAL_PCT: 24,
  POUCH: 28,
  TOP_SEAL: 29,
  MAP: 30,
  SKIN: 31,
  MULTIVAC: 32,
  COMMENT: 36,
};

const HEADER_ROW_INDEX = 12; // 0-based (row 13 in Excel)
const DATA_START_INDEX = 13; // 0-based (row 14 in Excel)

function isChecked(val: unknown): boolean {
  return String(val ?? '').toLowerCase() === 'o';
}

function strVal(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export function parseSupplierExcel(buffer: ArrayBuffer): SupplierRaw[] {
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find(n => TARGET_SHEET_PATTERN.test(n));
  if (!sheetName) throw new Error('Cannot find "Final ver." sheet in Excel file');

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });

  const suppliers: SupplierRaw[] = [];

  for (let i = DATA_START_INDEX; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const name = strVal(row[COL.SUPPLIER]);
    if (!name) continue;

    const isExcluded = name.startsWith('*') || strVal(row[COL.MAIN_CATE]).toLowerCase() === 'out';
    const rawMaterialScore = Number(row[COL.RAW_MATERIAL_SCORE]) || 0;
    const rawMaterialPct = Number(row[COL.RAW_MATERIAL_PCT]) || 0;

    suppliers.push({
      id: i,
      name: name.replace(/^\*/, '').replace(/\s*\/\s*out\s*$/i, '').trim(),
      location: strVal(row[COL.LOCATION]),
      vendor: strVal(row[COL.VENDOR]),
      mainCate: strVal(row[COL.MAIN_CATE]).replace(/\s*out\s*$/i, '').trim(),
      totalSku: Number(row[COL.TOTAL_SKU]) || 0,
      grade: strVal(row[COL.GRADE]),
      totalScore: Number(row[COL.TOTAL_SCORE]) || 0,
      businessCareer: strVal(row[COL.BUSINESS_CAREER]),
      businessScale: strVal(row[COL.BUSINESS_SCALE]),
      otherOem: strVal(row[COL.OTHER_OEM]),
      packingType: strVal(row[COL.PACKING_TYPE]),
      capa: strVal(row[COL.CAPA]),
      rawMaterialScore,
      rawMaterialPct,
      hasPouch: isChecked(row[COL.POUCH]),
      hasTopSeal: isChecked(row[COL.TOP_SEAL]),
      hasMap: isChecked(row[COL.MAP]),
      hasSkin: isChecked(row[COL.SKIN]),
      hasMultivac: isChecked(row[COL.MULTIVAC]),
      comment: strVal(row[COL.COMMENT]),
      isExcluded,
    });
  }

  return suppliers;
}
