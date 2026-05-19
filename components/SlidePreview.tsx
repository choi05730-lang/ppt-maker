'use client';
import { BrandStyle, SlideContent } from '@/types';

// 웹 미리보기에서 폰트 이름을 CSS 폰트 패밀리로 매핑
const FONT_MAP: Record<string, string> = {
  'Malgun Gothic': "'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif",
  '맑은 고딕': "'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif",
  'NanumGothic': "'NanumGothic', '나눔고딕', sans-serif",
  '나눔고딕': "'NanumGothic', '나눔고딕', sans-serif",
  'Apple SD Gothic Neo': "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  'Noto Sans KR': "'Noto Sans KR', sans-serif",
};

function cssFontFamily(font: string): string {
  return FONT_MAP[font] ?? `'${font}', 'Noto Sans KR', sans-serif`;
}

interface Props {
  slide: SlideContent;
  brand: BrandStyle;
  scale?: number;
  selected?: boolean;
  onClick?: () => void;
}

export default function SlidePreview({ slide, brand, scale = 1, selected, onClick }: Props) {
  const w = 480 * scale;
  const h = 270 * scale;
  const fs = (n: number) => Math.round(n * scale * 0.6);

  return (
    <div
      onClick={onClick}
      style={{
        width: w, height: h,
        backgroundColor: brand.bgColor,
        border: selected ? `3px solid ${brand.accentColor}` : '2px solid #e0e0e0',
        borderRadius: 6,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        fontFamily: cssFontFamily(brand.bodyFont),
        boxShadow: selected ? '0 0 0 2px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      {brand.logoBase64 && (
        <img
          src={brand.logoBase64}
          alt="logo"
          style={{
            position: 'absolute',
            left: (brand.logoX ?? 0) * (w / brand.slideWidth),
            top: (brand.logoY ?? 0) * (h / brand.slideHeight),
            width: (brand.logoW ?? 1) * (w / brand.slideWidth),
            height: (brand.logoH ?? 0.5) * (h / brand.slideHeight),
            objectFit: 'contain',
          }}
        />
      )}

      {slide.layout === 'title' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 * scale }}>
          <div style={{ fontSize: fs(brand.titleSize + 6), fontWeight: 'bold', color: brand.primaryColor, textAlign: 'center', lineHeight: 1.2 }}>
            {slide.title}
          </div>
          {slide.body && (
            <div style={{ fontSize: fs(brand.bodySize), color: '#666', marginTop: 8 * scale, textAlign: 'center' }}>
              {slide.body}
            </div>
          )}
        </div>
      )}

      {slide.layout === 'bullets' && (
        <div style={{ padding: `${10 * scale}px ${16 * scale}px` }}>
          <div style={{ fontSize: fs(brand.titleSize), fontWeight: brand.titleBold ? 'bold' : 'normal', color: brand.primaryColor, marginBottom: 6 * scale }}>
            {slide.title}
          </div>
          <div style={{ height: 2, backgroundColor: brand.accentColor, marginBottom: 8 * scale }} />
          <ul style={{ margin: 0, paddingLeft: 18 * scale, listStyle: 'disc' }}>
            {(slide.bullets ?? (slide.body ? slide.body.split('\n') : [])).map((b, i) => (
              <li key={i} style={{ fontSize: fs(brand.bodySize), color: '#404040', marginBottom: 3 * scale, lineHeight: 1.4 }}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {slide.layout === 'image' && (
        <div style={{ padding: `${10 * scale}px ${16 * scale}px`, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: fs(brand.titleSize), fontWeight: brand.titleBold ? 'bold' : 'normal', color: brand.primaryColor }}>
            {slide.title}
          </div>
          <div style={{ height: 2, backgroundColor: brand.accentColor, margin: `${4 * scale}px 0` }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="slide" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ border: `2px dashed ${brand.accentColor}`, borderRadius: 6, padding: 12 * scale, color: '#aaa', fontSize: fs(12), textAlign: 'center', width: '60%' }}>
                이미지 영역
              </div>
            )}
          </div>
          {slide.imageCaption && (
            <div style={{ fontSize: fs(brand.bodySize - 2), color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
              {slide.imageCaption}
            </div>
          )}
        </div>
      )}

      {slide.layout === 'split' && (
        <div style={{ padding: `${10 * scale}px ${16 * scale}px`, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: fs(brand.titleSize), fontWeight: brand.titleBold ? 'bold' : 'normal', color: brand.primaryColor }}>
            {slide.title}
          </div>
          <div style={{ height: 2, backgroundColor: brand.accentColor, margin: `${4 * scale}px 0` }} />
          <div style={{ flex: 1, display: 'flex', gap: 12 * scale }}>
            <div style={{ flex: 1 }}>
              <ul style={{ margin: 0, paddingLeft: 16 * scale, listStyle: 'disc' }}>
                {(slide.bullets ?? (slide.body ? slide.body.split('\n') : [])).map((b, i) => (
                  <li key={i} style={{ fontSize: fs(brand.bodySize), color: '#404040', marginBottom: 3 * scale }}>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {slide.imageUrl ? (
                <img src={slide.imageUrl} alt="right" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : slide.rightContent ? (
                <div style={{ fontSize: fs(brand.bodySize), color: '#404040' }}>{slide.rightContent}</div>
              ) : (
                <div style={{ border: `2px dashed ${brand.accentColor}`, borderRadius: 4, padding: 8, color: '#aaa', fontSize: fs(11), textAlign: 'center' }}>이미지</div>
              )}
            </div>
          </div>
        </div>
      )}

      {slide.layout === 'table' && (
        <div style={{ padding: `${10 * scale}px ${16 * scale}px`, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: fs(brand.titleSize), fontWeight: brand.titleBold ? 'bold' : 'normal', color: brand.primaryColor }}>
            {slide.title}
          </div>
          <div style={{ height: 2, backgroundColor: brand.accentColor, margin: `${4 * scale}px 0` }} />
          {slide.tableData && slide.tableData.length > 0 && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: fs(brand.bodySize - 2) }}>
                <tbody>
                  {slide.tableData.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{
                          border: '1px solid #ddd',
                          padding: `${3 * scale}px ${5 * scale}px`,
                          backgroundColor: ri === 0 ? brand.primaryColor : ri % 2 === 0 ? '#f0f0f0' : '#fff',
                          color: ri === 0 ? '#fff' : '#333',
                          fontWeight: ri === 0 ? 'bold' : 'normal',
                          textAlign: 'center',
                        }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
