import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractStyleFromPptx, extractSlideStructures } from '@/lib/extractStyle';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const [style, structures] = await Promise.all([
    extractStyleFromPptx(buffer),
    extractSlideStructures(buffer),
  ]);

  let structurePattern = '';
  if (structures.length > 0) {
    const structureSummary = structures.map(s => {
      const chartDesc = s.charts.length > 0
        ? s.charts.map(c => `${c.type}${c.isPivot ? '(pivot)' : ''}`).join('+')
        : 'none';
      return `Slide ${s.index}: texts=${s.textBlocks}, table=${s.hasTable}, image=${s.hasImage}, charts=${chartDesc}, chars=${s.totalTextLength}`;
    }).join('\n');

    const avgChars = Math.round(structures.reduce((a, s) => a + s.totalTextLength, 0) / structures.length);
    const tableCount = structures.filter(s => s.hasTable).length;
    const imageCount = structures.filter(s => s.hasImage).length;
    const allCharts = structures.flatMap(s => s.charts);
    const chartCount = allCharts.length;
    const pivotCount = allCharts.filter(c => c.isPivot).length;
    const chartTypes = [...new Set(allCharts.map(c => c.type))].join(', ');

    try {
      const res = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Analyze this PPT structure and summarize the organizational pattern in 1-2 sentences (in Korean). Focus on: layout flow, information density, and visualization preferences (especially chart types and pivot usage).

Slide data:
${structureSummary}

Summary stats: total ${structures.length} slides, avg ${avgChars} chars/slide, tables in ${tableCount} slides, images in ${imageCount} slides, charts: ${chartCount} total (types: ${chartTypes || 'none'}, pivot: ${pivotCount}).

Respond with ONLY the pattern description in Korean, no other text.`,
        }],
      });
      structurePattern = (res.content[0] as { type: string; text: string }).text.trim();
    } catch {
      const chartSummary = chartCount > 0 ? `, 차트 ${chartCount}개(${chartTypes})${pivotCount > 0 ? ` 피벗 ${pivotCount}개` : ''}` : '';
      structurePattern = `슬라이드 ${structures.length}장, 슬라이드당 평균 ${avgChars}자, 표 ${tableCount}장${chartSummary}`;
    }
  }

  return NextResponse.json({ ...style, structurePattern });
}
