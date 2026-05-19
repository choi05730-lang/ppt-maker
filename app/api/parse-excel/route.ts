import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const result: Record<string, { headers: string[]; rows: (string | number)[][] }> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: '',
    });
    if (json.length === 0) continue;
    const headers = (json[0] as (string | number)[]).map(h => String(h));
    const rows = json.slice(1).filter(r => r.some(v => v !== ''));
    result[sheetName] = { headers, rows: rows as (string | number)[][] };
  }

  return NextResponse.json({ sheets: workbook.SheetNames, data: result });
}
