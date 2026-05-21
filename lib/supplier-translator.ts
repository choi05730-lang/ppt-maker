import Anthropic from '@anthropic-ai/sdk';
import type { SupplierRaw, SupplierEnglish } from './supplier-types';

const client = new Anthropic();

interface TranslationResult {
  nameEn: string;
  locationEn: string;
  businessCareerEn: string;
  businessScaleEn: string;
  mainCateLines: string[];
  otherOemEn: string;
  capaEn: string;
  rawMaterialSupplyLines: string[];
}

const SYSTEM_PROMPT = `You are a professional Korean-to-English translator for food industry supplier documentation.
Translate Korean supplier data to English for a PowerPoint slide.
Return ONLY valid JSON with no markdown or explanation.

Translation rules:
- Company names: use English transliteration (e.g., 달구벌명가 → Dalgubeol Myungjia, 미소찬 → Misocan, 정석푸드 → JungSeok Food)
- Locations: use standard English romanization (e.g., 경상북도 경산시 → Gyeongsan, North Gyeongsang)
- businessCareerEn: convert "2013년~" → "2013y ~", keep the year exactly
- businessScaleEn: convert Korean won amounts (e.g., "16억" → "16 billion won", "2800억" → "2800 billion won")
- mainCateLines: array of strings each starting with "√ ", format: "√ Imported Pork(Frozen) / 4 SKU"
  - 돼지고기 → Pork, 소고기 → Beef, 닭고기 → Chicken/Poultry, 양고기 → Lamb
  - 냉장 → Chilled, 냉동 → Frozen
  - 수입 → Imported, 국내 → Domestic
- otherOemEn: translate Korean company names to English (e.g., 동원F&B → Dongwon F&B, 코스트코 → Costco, 이마트 → E-mart)
- capaEn: format as "X t / month" (e.g., "20t" → "20 t / month", "770t" → "770 t / month")
- rawMaterialSupplyLines: describe the raw material sourcing in 2-4 lines, each starting with "√" or "-"`;

export async function translateSupplier(raw: SupplierRaw): Promise<SupplierEnglish> {
  const input = {
    supplier_name: raw.name,
    location: raw.location,
    main_categories: raw.mainCate,
    total_sku: raw.totalSku,
    other_oem: raw.otherOem,
    one_line_description: raw.packingType,
    business_career_raw: raw.businessCareer,
    business_scale_raw: raw.businessScale,
    capa_raw: raw.capa,
    raw_material_pct: raw.rawMaterialPct,
    comment: raw.comment.slice(0, 300),
  };

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Translate this supplier data to English and return JSON:\n${JSON.stringify(input, null, 2)}\n\nReturn JSON with keys: nameEn, locationEn, businessCareerEn, businessScaleEn, mainCateLines (array), otherOemEn, capaEn, rawMaterialSupplyLines (array)`,
      },
    ],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';

  let result: TranslationResult;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    // Fallback if Claude doesn't return clean JSON
    result = buildFallback(raw);
  }

  return {
    raw,
    nameEn: result.nameEn || raw.name,
    locationEn: result.locationEn || raw.location,
    businessCareerEn: result.businessCareerEn || raw.businessCareer,
    businessScaleEn: result.businessScaleEn || raw.businessScale,
    mainCateLines: result.mainCateLines?.length ? result.mainCateLines : [`√ ${raw.mainCate} / ${raw.totalSku} SKU`],
    otherOemEn: result.otherOemEn || raw.otherOem,
    capaEn: result.capaEn || raw.capa,
    rawMaterialSupplyLines: result.rawMaterialSupplyLines?.length
      ? result.rawMaterialSupplyLines
      : ['√ TBD'],
  };
}

function buildFallback(raw: SupplierRaw): TranslationResult {
  return {
    nameEn: raw.name,
    locationEn: raw.location,
    businessCareerEn: raw.businessCareer.replace('년~', 'y ~'),
    businessScaleEn: raw.businessScale.replace('억', ' billion won'),
    mainCateLines: [`√ ${raw.mainCate} / ${raw.totalSku} SKU`],
    otherOemEn: raw.otherOem,
    capaEn: raw.capa.replace('t', ' t / month'),
    rawMaterialSupplyLines: ['√ TBD'],
  };
}
