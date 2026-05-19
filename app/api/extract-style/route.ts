import { NextRequest, NextResponse } from 'next/server';
import { extractStyleFromPptx } from '@/lib/extractStyle';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const style = await extractStyleFromPptx(buffer);
  return NextResponse.json(style);
}
