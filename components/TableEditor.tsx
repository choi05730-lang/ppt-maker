'use client';
import { useRef } from 'react';
import { BrandStyle } from '@/types';

interface Props {
  data: string[][];
  brand: BrandStyle;
  onChange: (data: string[][]) => void;
  onExcelImport: () => void;
}

export default function TableEditor({ data, brand, onChange, onExcelImport }: Props) {
  const rows = data.length > 0 ? data : [['헤더1', '헤더2', '헤더3'], ['', '', '']];
  const colCount = Math.max(...rows.map(r => r.length), 1);

  function setCell(ri: number, ci: number, value: string) {
    const next = rows.map(r => [...r]);
    while (next[ri].length <= ci) next[ri].push('');
    next[ri][ci] = value;
    onChange(next);
  }

  function addRow() {
    onChange([...rows, Array(colCount).fill('')]);
  }

  function addCol() {
    onChange(rows.map(r => [...r, '']));
  }

  function deleteRow(ri: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== ri));
  }

  function deleteCol(ci: number) {
    if (colCount <= 1) return;
    onChange(rows.map(r => r.filter((_, i) => i !== ci)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 툴바 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#888', marginRight: 4 }}>표 편집</span>
        <button onClick={addRow} style={btnStyle('#2E75B6')}>+ 행 추가</button>
        <button onClick={addCol} style={btnStyle('#2E75B6')}>+ 열 추가</button>
        <button
          onClick={onExcelImport}
          style={btnStyle('#5BA85F')}
        >
          📂 엑셀에서 불러오기
        </button>
      </div>

      {/* 그리드 */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1.5px solid #ddd' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: colCount * 90 }}>
          {/* 열 삭제 버튼 행 */}
          <thead>
            <tr>
              <td style={{ width: 24, background: '#f5f5f5' }} />
              {Array.from({ length: colCount }).map((_, ci) => (
                <td key={ci} style={{ background: '#f5f5f5', textAlign: 'center', padding: '2px 0' }}>
                  <button
                    onClick={() => deleteCol(ci)}
                    title="열 삭제"
                    style={{ border: 'none', background: 'none', color: '#ccc', cursor: 'pointer', fontSize: 12, padding: '0 4px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e55')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                  >
                    ✕
                  </button>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {/* 행 삭제 버튼 */}
                <td style={{ background: '#f5f5f5', textAlign: 'center', width: 24 }}>
                  <button
                    onClick={() => deleteRow(ri)}
                    title="행 삭제"
                    style={{ border: 'none', background: 'none', color: '#ccc', cursor: 'pointer', fontSize: 12, padding: '0 4px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e55')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                  >
                    ✕
                  </button>
                </td>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: 0,
                      background: ri === 0 ? brand.primaryColor : ri % 2 === 0 ? '#f9f9f9' : '#fff',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <input
                      value={row[ci] ?? ''}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      placeholder={ri === 0 ? `헤더 ${ci + 1}` : ''}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: 12,
                        color: ri === 0 ? '#fff' : '#333',
                        fontWeight: ri === 0 ? 600 : 400,
                        boxSizing: 'border-box',
                        minWidth: 70,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: '#bbb' }}>
        첫 번째 행은 헤더로 처리됩니다
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 6,
    border: `1.5px solid ${color}`,
    background: '#fff',
    color,
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
  };
}
