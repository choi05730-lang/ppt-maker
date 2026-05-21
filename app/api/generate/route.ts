import { NextRequest, NextResponse } from 'next/server';
import { generatePptx } from '@/lib/generatePptx';
import { BrandStyle, SlideContent } from '@/types';

export async function POST(req: NextRequest) {
  try {
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
  } catch (err) {
    console.error('[generate] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
