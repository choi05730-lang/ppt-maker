import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SlideContent } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

  const systemPrompt = `You are a presentation structure expert. Given raw text, split it into slides and choose the best layout for each.

Available layouts:
- "title": Title only (for opening slide, section divider)
- "bullets": Title + bullet points (for lists, steps, features)
- "image": Title + image placeholder + caption (when image is described)
- "split": Left text + right image/text (for comparisons, before/after)
- "table": Title + table data (for data, comparisons with rows/cols)

Return a JSON array of slides. Each slide:
{
  "layout": "bullets",
  "title": "...",
  "bullets": ["point 1", "point 2"],      // for bullets layout
  "body": "...",                           // for title/image layout
  "imageCaption": "...",                   // for image layout
  "rightContent": "...",                   // for split layout (right side text)
  "tableData": [["Col1","Col2"],["R1C1","R1C2"]]  // for table layout
}

Rules:
- First slide should usually be "title" layout
- Keep titles concise (under 10 words)
- Bullets: max 6 per slide, each under 15 words
- If content is very long, split into multiple slides
- Return ONLY the JSON array, no other text`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
  });

  const raw = (response.content[0] as { type: string; text: string }).text;
  let slides: Omit<SlideContent, 'id'>[];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    slides = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: 'AI parsing failed', raw }, { status: 500 });
  }

  const result: SlideContent[] = slides.map(s => ({ ...s, id: uuidv4() }));
  return NextResponse.json(result);
}
