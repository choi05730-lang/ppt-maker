export interface SupplierRaw {
  id: number;
  name: string;
  location: string;
  vendor: string;
  mainCate: string;
  totalSku: number;
  grade: string;
  totalScore: number;
  businessCareer: string;  // e.g. "2013년~"
  businessScale: string;   // e.g. "16억"
  otherOem: string;
  packingType: string;
  capa: string;
  rawMaterialScore: number;
  rawMaterialPct: number;
  hasPouch: boolean;
  hasTopSeal: boolean;
  hasMap: boolean;
  hasSkin: boolean;
  hasMultivac: boolean;
  comment: string;
  isExcluded: boolean;
}

export interface SupplierEnglish {
  raw: SupplierRaw;
  nameEn: string;
  locationEn: string;
  businessCareerEn: string;   // "2013y ~"
  businessScaleEn: string;    // "16 billion won"
  mainCateLines: string[];    // ["√ Imported Pork(Frozen) / 4 SKU", ...]
  otherOemEn: string;
  capaEn: string;
  rawMaterialSupplyLines: string[];
}
