import JSZip from 'jszip';
import { BrandStyle } from '@/types';

const DEFAULT_STYLE: BrandStyle = {
  titleFont: 'Malgun Gothic',
  bodyFont: 'Malgun Gothic',
  titleSize: 36,
  bodySize: 18,
  titleBold: true,
  colors: ['#1F3864', '#2E75B6', '#FFFFFF', '#404040'],
  primaryColor: '#1F3864',
  accentColor: '#2E75B6',
  bgColor: '#FFFFFF',
  slideWidth: 13.33,
  slideHeight: 7.5,
};

function parseColor(val: string): string | null {
  const m = val.match(/([0-9A-Fa-f]{6})/);
  return m ? `#${m[1].toUpperCase()}` : null;
}

function parseEmu(val: string): number {
  // EMU to inches: 1 inch = 914400 EMU
  return parseInt(val) / 914400;
}

export async function extractStyleFromPptx(buffer: ArrayBuffer): Promise<BrandStyle> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const style = { ...DEFAULT_STYLE };
    const colors = new Set<string>();

    // Parse theme colors
    const themeFile = zip.file('ppt/theme/theme1.xml');
    if (themeFile) {
      const xml = await themeFile.async('text');
      const colorMatches = xml.matchAll(/val="([0-9A-Fa-f]{6})"/g);
      for (const m of colorMatches) {
        colors.add(`#${m[1].toUpperCase()}`);
      }
      // Font extraction — prefer Korean-compatible fonts
      const KOREAN_FONTS = ['Malgun Gothic', 'Noto Sans KR', '맑은 고딕', '나눔고딕', 'NanumGothic', 'Apple SD Gothic Neo', 'KoPubDotum'];
      const fontMatches = [...xml.matchAll(/<a:latin typeface="([^"]+)"/g)];
      const extractedFont = fontMatches.map(m => m[1]).find(f =>
        KOREAN_FONTS.some(kf => f.toLowerCase().includes(kf.toLowerCase()))
      ) ?? fontMatches[0]?.[1];
      if (extractedFont && !['Calibri', 'Times New Roman', 'Cambria'].includes(extractedFont)) {
        style.titleFont = extractedFont;
        style.bodyFont = extractedFont;
      }
    }

    // Parse slide master for font sizes and more colors
    const masterFile = zip.file('ppt/slideMasters/slideMaster1.xml');
    if (masterFile) {
      const xml = await masterFile.async('text');
      const titleSizeMatch = xml.match(/<a:defRPr[^>]*sz="(\d+)"/);
      if (titleSizeMatch) {
        style.titleSize = parseInt(titleSizeMatch[1]) / 100;
      }
      // Check for bold title
      if (xml.includes('<a:defRPr') && xml.includes('b="1"')) {
        style.titleBold = true;
      }
      const colorMatches = xml.matchAll(/val="([0-9A-Fa-f]{6})"/g);
      for (const m of colorMatches) {
        colors.add(`#${m[1].toUpperCase()}`);
      }
    }

    // Parse first slide for logo detection
    const slide1 = zip.file('ppt/slides/slide1.xml');
    if (slide1) {
      const xml = await slide1.async('text');
      // Find image shapes (pic elements)
      const picMatches = xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g);
      for (const match of picMatches) {
        const picXml = match[1];
        const rIdMatch = picXml.match(/r:embed="(rId\d+)"/);
        const offMatch = picXml.match(/<a:off x="(\d+)" y="(\d+)"/);
        const extMatch = picXml.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
        if (rIdMatch && offMatch && extMatch) {
          style.logoX = parseEmu(offMatch[1]);
          style.logoY = parseEmu(offMatch[2]);
          style.logoW = parseEmu(extMatch[1]);
          style.logoH = parseEmu(extMatch[2]);
          // Get logo image data
          const relsFile = zip.file('ppt/slides/_rels/slide1.xml.rels');
          if (relsFile) {
            const relsXml = await relsFile.async('text');
            const targetMatch = relsXml.match(
              new RegExp(`Id="${rIdMatch[1]}"[^/]*Target="([^"]+)"`)
            );
            if (targetMatch) {
              const imgPath = `ppt/slides/${targetMatch[1]}`.replace(/\/\//g, '/').replace(/ppt\/slides\/\.\.\//, 'ppt/');
              const imgFile = zip.file(imgPath) || zip.file(`ppt/${targetMatch[1].replace('../', '')}`);
              if (imgFile) {
                const imgData = await imgFile.async('base64');
                const ext = imgPath.split('.').pop()?.toLowerCase() || 'png';
                style.logoBase64 = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${imgData}`;
              }
            }
          }
          break; // Only first image as logo
        }
      }
    }

    const colorArr = Array.from(colors).filter(c => c !== '#FFFFFF' && c !== '#000000');
    if (colorArr.length > 0) {
      style.colors = colorArr.slice(0, 6);
      style.primaryColor = colorArr[0];
      style.accentColor = colorArr[1] || colorArr[0];
    }

    return style;
  } catch (e) {
    console.error('Style extraction failed:', e);
    return DEFAULT_STYLE;
  }
}

export interface SlideChartInfo {
  type: string; // bar, pie, line, doughnut, area, scatter, radar, etc.
  isPivot: boolean;
}

export interface SlideStructureItem {
  index: number;
  textBlocks: number;
  hasTable: boolean;
  hasImage: boolean;
  charts: SlideChartInfo[];
  totalTextLength: number;
}

const CHART_TYPE_TAGS: Record<string, string> = {
  '<c:barChart': 'bar',
  '<c:lineChart': 'line',
  '<c:pieChart': 'pie',
  '<c:doughnutChart': 'doughnut',
  '<c:areaChart': 'area',
  '<c:scatterChart': 'scatter',
  '<c:radarChart': 'radar',
  '<c:bubbleChart': 'bubble',
};

async function parseChartFile(zip: JSZip, chartPath: string): Promise<SlideChartInfo | null> {
  const file = zip.file(chartPath);
  if (!file) return null;
  const xml = await file.async('text');

  let type = 'unknown';
  for (const [tag, name] of Object.entries(CHART_TYPE_TAGS)) {
    if (xml.includes(tag)) { type = name; break; }
  }

  const isPivot = xml.includes('<c:pivotSource');
  return { type, isPivot };
}

export async function extractSlideStructures(buffer: ArrayBuffer): Promise<SlideStructureItem[]> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const structures: SlideStructureItem[] = [];

    const slideFiles = Object.keys(zip.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] ?? '0');
        const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] ?? '0');
        return numA - numB;
      });

    for (let i = 0; i < slideFiles.length; i++) {
      const file = zip.file(slideFiles[i]);
      if (!file) continue;
      const xml = await file.async('text');

      const textBlocks = (xml.match(/<p:sp[>\s]/g) ?? []).length;
      const hasTable = xml.includes('<a:tbl>') || xml.includes('<a:tbl ');
      const hasImage = xml.includes('<p:pic>') || xml.includes('<p:pic ');
      const textContent = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join('');
      const totalTextLength = textContent.replace(/\s/g, '').length;

      // Resolve charts via slide relationship file
      const charts: SlideChartInfo[] = [];
      if (xml.includes('<c:chart')) {
        const slideNum = i + 1;
        const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
        const relsFile = zip.file(relsPath);
        if (relsFile) {
          const relsXml = await relsFile.async('text');
          const chartRefs = [...relsXml.matchAll(/Target="([^"]*chart[^"]*\.xml)"/gi)];
          for (const ref of chartRefs) {
            const target = ref[1].replace(/^\.\.\//, 'ppt/');
            const info = await parseChartFile(zip, target);
            if (info) charts.push(info);
          }
        }
        // fallback if rels didn't resolve
        if (charts.length === 0) charts.push({ type: 'unknown', isPivot: false });
      }

      structures.push({ index: i + 1, textBlocks, hasTable, hasImage, charts, totalTextLength });
    }

    return structures;
  } catch {
    return [];
  }
}
