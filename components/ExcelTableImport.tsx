'use client';
import { useState, useRef } from 'react';
import { BrandStyle } from '@/types';

interface SheetData {
  headers: string[];
  rows: (string | number)[][];
}

interface Props {
  brand: BrandStyle;
  onImport: (tableData: string[][]) => void;
  onClose: () => void;
}

export default function ExcelTableImport({ brand, onImport, onClose }: Props) {
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<Record<string, SheetData>>({});
  const [selectedSheet, setSelectedSheet] = useState('');
  const [maxRows, setMaxRows] = useState(20);
  const [loading, setLoading] = useState(false);

  const current = sheetData[selectedSheet];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/parse-excel', { method: 'POST', body: fd });
    if (res.ok) {
      const { sheets: s, data } = await res.json();
      setSheets(s);
      setSheetData(data);
      setSelectedSheet(s[0]);
    }
    setLoading(false);
  }

  function handleImport() {
    if (!current) return;
    const header = current.headers.map(h => String(h));
    const rows = current.rows.slice(0, maxRows).map(r =>
      current.headers.map((_, ci) => String(r[ci] ?? ''))
    );
    onImport([header, ...rows]);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 620, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#222' }}>엑셀에서 표 불러오기</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#666' }}>⏳ 파일 분석 중...</div>
          )}

          {!loading && sheets.length === 0 && (
            <label style={{ display: 'block', border: `2px dashed ${brand.accentColor}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', color: '#888' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 14, color: '#444', marginBottom: 4 }}>엑셀 파일 업로드</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>.xlsx, .xls 지원</div>
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
            </label>
          )}

          {!loading && sheets.length > 0 && current && (
            <>
              {/* 시트 선택 */}
              {sheets.length > 1 && (
                <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  시트 선택
                  <select
                    value={selectedSheet}
                    onChange={e => setSelectedSheet(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14 }}
                  >
                    {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              )}

              {/* 최대 행 수 */}
              <label style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 10 }}>
                최대 행 수
                <input
                  type="number"
                  min={1}
                  max={current.rows.length}
                  value={maxRows}
                  onChange={e => setMaxRows(Number(e.target.value))}
                  style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 13 }}
                />
                <span style={{ color: '#aaa', fontSize: 12 }}>/ 전체 {current.rows.length}행</span>
              </label>

              {/* 미리보기 */}
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>미리보기</div>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #eee', maxHeight: 280 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {current.headers.map((h, i) => (
                          <th key={i} style={{ padding: '8px 12px', background: brand.primaryColor, color: '#fff', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0 }}>
                            {h || `열 ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {current.rows.slice(0, maxRows).map((row, ri) => (
                        <tr key={ri} style={{ background: ri % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                          {current.headers.map((_, ci) => (
                            <td key={ci} style={{ padding: '6px 12px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                              {String(row[ci] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', color: '#555', fontSize: 14, cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  onClick={handleImport}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: brand.primaryColor, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  표로 삽입 ({Math.min(maxRows, current.rows.length) + 1}행 × {current.headers.length}열)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
