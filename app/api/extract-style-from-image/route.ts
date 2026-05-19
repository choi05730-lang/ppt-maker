import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BrandStyle } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEFAULT: Partial<BrandStyle> = {
  titleFont: 'Malgun Gothic',
  bodyFont: 'Malgun Gothic',
  titleSize: 28,
  bodySize: 16,
  titleBold: true,
  slideWidth: 13.33,
  slideHeight: 7.5,
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = (file.type || 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `이 디자인 이미지에서 PPT 스타일 요소를 추출해주세요.

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "primaryColor": "#hex",
  "accentColor": "#hex",
  "bgColor": "#hex",
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "titleFont": "폰트명 또는 Malgun Gothic",
  "bodyFont": "폰트명 또는 Malgun Gothic",
  "titleBold": true,
  "styleDescription": "한 줄 스타일 설명"
}

규칙:
- primaryColor: 가장 지배적인 브랜드/강조 색상 (헤더, 제목 텍스트 색상)
- accentColor: 두 번째 강조 색상 (버튼, 선, 포인트 요소)
- bgColor: 배경 색상
- colors: 이미지에서 보이는 주요 색상 최대 5개 (hex 코드)
- titleFont: 제목에 사용된 폰트 (한글 폰트면 Malgun Gothic, 영문이면 실제 폰트명)
- styleDescription: 이 디자인의 느낌 한 줄 요약 (예: "딥 네이비 기반의 모던 코퍼레이트")
- 모든 색상은 반드시 정확한 hex 코드로`,
          },
        ],
      },
    ],
  });

  const raw = (response.content[0] as { type: string; text: string }).text;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const extracted = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const result: BrandStyle & { styleDescription?: string } = {
      ...DEFAULT,
      ...extracted,
    } as BrandStyle & { styleDescription?: string };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'AI parsing failed', raw }, { status: 500 });
  }
}
