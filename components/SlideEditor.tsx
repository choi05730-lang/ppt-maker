'use client';
import { BrandStyle, LayoutType, SlideContent } from '@/types';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ChartBuilder = dynamic(() => import('./ChartBuilder'), { ssr: false });
const TableEditor = dynamic(() => import('./TableEditor'), { ssr: false });
const ExcelTableImport = dynamic(() => import('./ExcelTableImport'), { ssr: false });

interface Props {
  slide: SlideContent;
  brand: BrandStyle;
  onChange: (updated: SlideContent) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const LAYOUT_LABELS: Record<LayoutType, string> = {
  title: '제목',
  bullets: '제목+불릿',
  image: '제목+이미지',
  split: '좌우분할',
  table: '표',
};

export default function SlideEditor({ slide, brand, onChange, onDelete, onDuplicate }: Props) {
  const imgRef = useRef<HTMLInputElement>(null);
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [showExcelTable, setShowExcelTable] = useState(false);

  function update(patch: Partial<SlideContent>) {
    onChange({ ...slide, ...patch });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  function handleBulletsChange(value: string) {
    update({ bullets: value.split('\n').filter(l => l.trim()), body: value });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Layout selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(Object.keys(LAYOUT_LABELS) as LayoutType[]).map(l => (
          <button
            key={l}
            onClick={() => update({ layout: l })}
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              border: `2px solid ${slide.layout === l ? brand.accentColor : '#ddd'}`,
              background: slide.layout === l ? brand.accentColor : '#fff',
              color: slide.layout === l ? '#fff' : '#555',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: slide.layout === l ? 600 : 400,
            }}
          >
            {LAYOUT_LABELS[l]}
          </button>
        ))}
      </div>

      {/* Title */}
      <label style={{ fontSize: 12, color: '#888', display: 'flex', flexDirection: 'column', gap: 4 }}>
        제목
        <input
          value={slide.title}
          onChange={e => update({ title: e.target.value })}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 14, outline: 'none' }}
          placeholder="슬라이드 제목"
        />
      </label>

      {/* Bullets */}
      {(slide.layout === 'bullets' || slide.layout === 'split') && (
        <label style={{ fontSize: 12, color: '#888', display: 'flex', flexDirection: 'column', gap: 4 }}>
          내용 (줄바꿈으로 불릿 구분)
          <textarea
            value={(slide.bullets ?? []).join('\n') || slide.body || ''}
            onChange={e => handleBulletsChange(e.target.value)}
            rows={5}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 13, resize: 'vertical', outline: 'none' }}
            placeholder="• 항목 1&#10;• 항목 2&#10;• 항목 3"
          />
        </label>
      )}

      {/* Body text */}
      {(slide.layout === 'title' || slide.layout === 'image') && (
        <label style={{ fontSize: 12, color: '#888', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {slide.layout === 'image' ? '이미지 캡션' : '부제목/설명'}
          <input
            value={slide.layout === 'image' ? (slide.imageCaption ?? '') : (slide.body ?? '')}
            onChange={e => slide.layout === 'image' ? update({ imageCaption: e.target.value }) : update({ body: e.target.value })}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 13, outline: 'none' }}
            placeholder={slide.layout === 'image' ? '이미지 설명' : '부제목'}
          />
        </label>
      )}

      {/* Right content for split */}
      {slide.layout === 'split' && (
        <label style={{ fontSize: 12, color: '#888', display: 'flex', flexDirection: 'column', gap: 4 }}>
          오른쪽 텍스트 (이미지 미업로드 시 표시)
          <textarea
            value={slide.rightContent ?? ''}
            onChange={e => update({ rightContent: e.target.value })}
            rows={3}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 13, resize: 'vertical', outline: 'none' }}
          />
        </label>
      )}

      {/* Image upload */}
      {(slide.layout === 'image' || slide.layout === 'split') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#888' }}>이미지 / 차트</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => imgRef.current?.click()}
              style={{ padding: '6px 14px', borderRadius: 6, border: `1.5px solid ${brand.accentColor}`, background: '#fff', color: brand.accentColor, fontSize: 13, cursor: 'pointer' }}
            >
              이미지 업로드
            </button>
            <button
              onClick={() => setShowChartBuilder(true)}
              style={{ padding: '6px 14px', borderRadius: 6, border: `1.5px solid #5BA85F`, background: '#fff', color: '#5BA85F', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
            >
              📊 엑셀 차트
            </button>
            {slide.imageUrl && (
              <button
                onClick={() => update({ imageUrl: undefined })}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #f00', background: '#fff', color: '#f00', fontSize: 12, cursor: 'pointer' }}
              >
                제거
              </button>
            )}
          </div>
          {slide.imageUrl && (
            <img src={slide.imageUrl} alt="preview" style={{ maxHeight: 80, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee' }} />
          )}
          <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>
      )}

      {/* 모든 레이아웃에서 차트 삽입 가능 (이미지 레이아웃이 아닐 때) */}
      {slide.layout !== 'image' && slide.layout !== 'split' && (
        <div style={{ paddingTop: 8, borderTop: '1px dashed #eee' }}>
          <button
            onClick={() => setShowChartBuilder(true)}
            style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1.5px dashed #5BA85F`, background: '#f6fff7', color: '#5BA85F', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            📊 엑셀 차트를 이 슬라이드에 삽입
          </button>
          {slide.imageUrl && (
            <div style={{ marginTop: 8 }}>
              <img src={slide.imageUrl} alt="chart" style={{ maxHeight: 80, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee', width: '100%' }} />
              <button
                onClick={() => update({ imageUrl: undefined })}
                style={{ marginTop: 4, padding: '4px 10px', borderRadius: 6, border: '1.5px solid #f00', background: '#fff', color: '#f00', fontSize: 12, cursor: 'pointer' }}
              >
                차트 제거
              </button>
            </div>
          )}
        </div>
      )}

      {/* ChartBuilder 모달 */}
      {showChartBuilder && (
        <ChartBuilder
          brand={brand}
          onInsert={(dataUrl, title) => {
            update({ imageUrl: dataUrl, layout: slide.layout === 'title' || slide.layout === 'bullets' ? 'image' : slide.layout, imageCaption: title });
            setShowChartBuilder(false);
          }}
          onClose={() => setShowChartBuilder(false)}
        />
      )}

      {/* Table editor */}
      {slide.layout === 'table' && (
        <TableEditor
          data={slide.tableData ?? [['헤더1', '헤더2', '헤더3'], ['', '', '']]}
          brand={brand}
          onChange={tableData => update({ tableData })}
          onExcelImport={() => setShowExcelTable(true)}
        />
      )}

      {/* Excel table import modal */}
      {showExcelTable && (
        <ExcelTableImport
          brand={brand}
          onImport={tableData => {
            update({ tableData, layout: 'table' });
            setShowExcelTable(false);
          }}
          onClose={() => setShowExcelTable(false)}
        />
      )}

      {/* Duplicate / Delete buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          onClick={onDuplicate}
          style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #c0d8f0', background: '#f0f7ff', color: '#2E75B6', fontSize: 12, cursor: 'pointer' }}
        >
          슬라이드 복제
        </button>
        <button
          onClick={onDelete}
          style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #ffcccc', background: '#fff5f5', color: '#cc3333', fontSize: 12, cursor: 'pointer' }}
        >
          슬라이드 삭제
        </button>
      </div>
    </div>
  );
}
