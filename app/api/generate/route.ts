import { NextRequest, NextResponse } from 'next/server';
import { generatePptx } from '@/lib/generatePptx';
import { BrandStyle, SlideContent } from '@/types';

export async function POST(req: NextRequest) {
  const { slides, brand }: { slides: SlideContent[]; brand: BrandStyle } = await req.json();
  if (!slides || !brand) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const blob = await generatePptx(slides, brand);
  const arrayBuffer = await blob.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="presentation.pptx"`,
    },
  });
}
