import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { headers, rows } = await req.json();
  if (!headers || !rows) return NextResponse.json({ error: 'No data' }, { status: 400 });

  const sample = rows.slice(0, 8);
  const prompt = `다음은 엑셀 데이터입니다.

헤더: ${JSON.stringify(headers)}
데이터 (최대 8행): ${JSON.stringify(sample)}

이 데이터에 가장 적합한 차트를 추천해주세요. 다음 JSON 형식으로만 응답하세요:
{
  "chartType": "bar" | "line" | "pie" | "doughnut",
  "labelColumn": 0,
  "dataColumns": [1, 2],
  "title": "차트 제목",
  "reasoning": "추천 이유 한 줄"
}

규칙:
- 비교(항목별 수치) → bar
- 추세(시간순 변화) → line
- 비율(합계 100%) → pie 또는 doughnut
- labelColumn: 라벨로 쓸 열 인덱스 (보통 0번째)
- dataColumns: 수치 데이터 열 인덱스 배열
- JSON만 응답, 다른 텍스트 없음`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (response.content[0] as { type: string; text: string }).text;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'AI parsing failed', raw }, { status: 500 });
  }
}
