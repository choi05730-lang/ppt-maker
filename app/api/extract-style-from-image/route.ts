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
            text: `이 PPT 슬라이드 이미지에서 디자인 스타일과 레이아웃 구조를 모두 분석해주세요.

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "primaryColor": "#hex",
  "accentColor": "#hex",
  "bgColor": "#hex",
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "titleFont": "폰트명 또는 Malgun Gothic",
  "bodyFont": "폰트명 또는 Malgun Gothic",
  "titleBold": true,
  "styleDescription": "한 줄 스타일 설명",
  "structurePattern": "레이아웃 구조 설명"
}

각 필드 규칙:
- primaryColor: 제목/헤더에 사용된 주 색상
- accentColor: 강조선·버튼·포인트에 사용된 두 번째 색상
- bgColor: 슬라이드 배경 색상
- colors: 이미지 내 주요 색상 최대 5개 (hex)
- titleFont: 제목 폰트 (한글이면 Malgun Gothic, 영문이면 실제 폰트명)
- styleDescription: 디자인 느낌 한 줄 (예: "딥 네이비 기반의 모던 코퍼레이트")
- structurePattern: 레이아웃 구조를 2-3문장으로 설명. 반드시 포함: 컬럼 수(몇 열), 섹션 구성 방식(번호 섹션/카드/표/불릿), 정보 밀도(섹션당 항목 수), 시각적 구분 요소(테두리 박스/구분선/배경). 예시: "3컬럼 그리드에 9개 번호 섹션이 배치되며, 각 섹션은 굵은 제목과 √ 불릿 2-5개로 구성. 전체를 둘러싼 테두리 박스 안에 정보가 밀집되어 있음."`,
          },
        ],
      },
    ],
  });

  const raw = (response.content[0] as { type: string; text: string }).text;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const extracted = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const result: BrandStyle & { styleDescription?: string; structurePattern?: string } = {
      ...DEFAULT,
      ...extracted,
    } as BrandStyle & { styleDescription?: string; structurePattern?: string };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'AI parsing failed', raw }, { status: 500 });
  }
}
