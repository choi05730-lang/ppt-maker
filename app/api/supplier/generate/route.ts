import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { translateSupplier } from '@/lib/supplier-translator';
import { generateSupplierPptx } from '@/lib/supplier-ppt-generator';
import type { SupplierRaw } from '@/lib/supplier-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { suppliers }: { suppliers: SupplierRaw[] } = await req.json();
    if (!suppliers?.length) {
      return NextResponse.json({ error: 'No suppliers selected' }, { status: 400 });
    }

    // Load template PPTX
    const templatePath = path.join(process.cwd(), 'public', 'supplier-template.pptx');
    const templateBuffer = await readFile(templatePath);

    // Translate all suppliers in parallel
    const translated = await Promise.all(suppliers.map(s => translateSupplier(s)));

    // Generate PPTX
    const pptxBuffer = await generateSupplierPptx(translated, templateBuffer.buffer);

    return new NextResponse(pptxBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="supplier-info.pptx"`,
      },
    });
  } catch (err) {
    console.error('[supplier/generate]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
