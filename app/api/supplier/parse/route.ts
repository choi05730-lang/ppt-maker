import { NextRequest, NextResponse } from 'next/server';
import { parseSupplierExcel } from '@/lib/supplier-parser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const suppliers = parseSupplierExcel(buffer);

    return NextResponse.json({ suppliers });
  } catch (err) {
    console.error('[supplier/parse]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
