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
