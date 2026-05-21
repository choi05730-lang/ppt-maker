import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SlideContent } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { text, slideCount, contentMode, structurePattern }: { text: string; slideCount?: number | null; contentMode?: 'compact' | 'preserve'; structurePattern?: string } = await req.json();
  if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

  let slideCountInstruction = '';
  if (slideCount != null) {
    const total = slideCount + 1; // +1 for title slide
    if (contentMode === 'preserve') {
      slideCountInstruction = `\nSLIDE COUNT: Target exactly ${total} slides total (1 title + ${slideCount} content slides). The first slide MUST be "title" layout. Preserve ALL content without omission — do not summarize or drop any information. If content is too dense, you may use up to ${total + 1} slides to avoid losing details, but prefer ${total}.`;
    } else {
      slideCountInstruction = `\nSLIDE COUNT: Generate exactly ${total} slides total (1 title + ${slideCount} content slides). The first slide MUST be "title" layout. Summarize and condense content as needed to fit precisely in the remaining ${slideCount} slides. Prioritize key points.`;
    }
  }

  const systemPrompt = `You are a presentation structure expert. Given raw text, split it into slides and choose the best layout for each.

Available layouts:
- "title": Title only (for opening slide, section divider)
- "bullets": Title + bullet points (for lists, steps, features)
- "image": Title + image placeholder + caption (when image is described)
- "split": Left text + right image/text (for comparisons, before/after)
- "table": Title + table data (for data, comparisons with rows/cols)
- "chart": Title + chart (for numeric trends, comparisons, distributions, time series)
- "columns": Multi-column info blocks (2-3 columns of grouped sections; use when content has 3+ distinct categories/groups shown side by side, like supplier info, capability overview, numbered sections)

Return a JSON array of slides. Each slide:
{
  "layout": "bullets",
  "title": "...",
  "bullets": ["point 1", "point 2"],      // for bullets layout
  "body": "...",                           // for title/image layout
  "imageCaption": "...",                   // for image layout
  "rightContent": "...",                   // for split layout (right side text)
  "tableData": [["Col1","Col2"],["R1C1","R1C2"]],  // for table layout
  "chartData": {                           // for chart layout — REQUIRED when layout is "chart"
    "type": "bar",                         // bar | line | pie | doughnut
    "title": "차트 제목",
    "labels": ["라벨1","라벨2","라벨3"],
    "datasets": [
      { "name": "시리즈명", "values": [10, 20, 30] }
    ]
  },
  "columnCount": 3,                        // for columns layout: 2 or 3
  "columnBlocks": [                        // for columns layout — REQUIRED
    { "header": "1) Section Title", "items": ["item 1", "item 2", "item 3"] },
    { "header": "2) Another Section", "items": ["item 1"] }
  ]
}

Rules:
- First slide should usually be "title" layout
- Keep titles concise (under 10 words)
- Bullets: max 6 per slide, each under 15 words
- Use "columns" layout (columnCount: 3) when content has multiple distinct info groups/categories (e.g. company profile with 6-9 sections, feature comparison, numbered sections displayed side by side). PREFER "columns" over "table" when the reference uses multi-column section layouts.
- Use "chart" layout when content has numeric data suitable for visualization (trends, distributions, comparisons of 3+ values)
- Use "bar" for category comparisons, "line" for trends over time, "pie"/"doughnut" for proportions (max 6 slices)
- If content is very long, split into multiple slides
- Return ONLY the JSON array, no other text${slideCountInstruction}${structurePattern ? `\n\nREFERENCE STRUCTURE PATTERN: ${structurePattern}\nCRITICAL — strictly apply this structural pattern:\n- If the reference uses multi-column layouts (2-column, 3-column), use "columns" layout with matching columnCount\n- If the reference uses numbered sections in a grid, use "columns" layout with columnBlocks matching that section structure\n- Mirror the information density per slide (dense = more columnBlocks per slide, sparse = fewer bullets per slide)\n- Match the preference for tables/charts/bullets exactly as described\n- PAGE COUNT constraint overrides this pattern if specified.` : ''}`;

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
