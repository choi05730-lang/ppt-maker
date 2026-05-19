'use client';
import { useState, useRef } from 'react';
import { BrandStyle, SlideContent } from '@/types';
import SlidePreview from '@/components/SlidePreview';
import SlideEditor from '@/components/SlideEditor';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_BRAND: BrandStyle = {
  titleFont: 'Malgun Gothic',
  bodyFont: 'Malgun Gothic',
  titleSize: 28,
  bodySize: 16,
  titleBold: true,
  colors: ['#1F3864', '#2E75B6', '#FFFFFF', '#404040'],
  primaryColor: '#1F3864',
  accentColor: '#2E75B6',
  bgColor: '#FFFFFF',
  slideWidth: 13.33,
  slideHeight: 7.5,
};

type Step = 'brand' | 'content' | 'edit';

export default function Home() {
  const [step, setStep] = useState<Step>('brand');
  const [brand, setBrand] = useState<BrandStyle>(DEFAULT_BRAND);
  const [rawText, setRawText] = useState('');
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const refFileRef = useRef<HTMLInputElement>(null);
  const imgRefFileRef = useRef<HTMLInputElement>(null);
  const configFileRef = useRef<HTMLInputElement>(null);
  const [styleDescription, setStyleDescription] = useState('');
  const [refImagePreview, setRefImagePreview] = useState('');

  async function handleReferenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setLoadingMsg('레퍼런스 분석 중...');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/extract-style', { method: 'POST', body: fd });
    if (res.ok) {
      const style = await res.json();
      setBrand(style);
    }
    setLoading(false);
    setLoadingMsg('');
  }

  async function handleImageRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // 미리보기용 URL
    const previewUrl = URL.createObjectURL(file);
    setRefImagePreview(previewUrl);
    setLoading(true);
    setLoadingMsg('AI가 디자인 분석 중...');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/extract-style-from-image', { method: 'POST', body: fd });
    if (res.ok) {
      const result = await res.json();
      const { styleDescription: desc, ...style } = result;
      setBrand(prev => ({ ...prev, ...style }));
      if (desc) setStyleDescription(desc);
    }
    setLoading(false);
    setLoadingMsg('');
  }

  async function handleStructure() {
    if (!rawText.trim()) return;
    setLoading(true);
    setLoadingMsg('AI가 슬라이드 구조화 중...');
    const res = await fetch('/api/structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText }),
    });
    if (res.ok) {
      const structured = await res.json();
      setSlides(structured);
      setSelectedSlideIdx(0);
      setStep('edit');
    }
    setLoading(false);
    setLoadingMsg('');
  }

  async function handleDownload() {
    setLoading(true);
    setLoadingMsg('PPTX 생성 중...');
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides, brand }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presentation.pptx';
      a.click();
      URL.revokeObjectURL(url);
    }
    setLoading(false);
    setLoadingMsg('');
  }

  function addSlide() {
    const newSlide: SlideContent = { id: uuidv4(), layout: 'bullets', title: '새 슬라이드', bullets: [] };
    setSlides(prev => [...prev, newSlide]);
    setSelectedSlideIdx(slides.length);
  }

  function updateSlide(idx: number, updated: SlideContent) {
    setSlides(prev => prev.map((s, i) => i === idx ? updated : s));
  }

  function deleteSlide(idx: number) {
    setSlides(prev => prev.filter((_, i) => i !== idx));
    setSelectedSlideIdx(Math.max(0, idx - 1));
  }

  function duplicateSlide(idx: number) {
    setSlides(prev => {
      const copy = { ...prev[idx], id: uuidv4() };
      const arr = [...prev];
      arr.splice(idx + 1, 0, copy);
      return arr;
    });
    setSelectedSlideIdx(idx + 1);
  }

  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function handleDragStart(i: number) {
    dragIdx.current = i;
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOverIdx(i);
  }

  function handleDrop(i: number) {
    const from = dragIdx.current;
    if (from === null || from === i) { setDragOverIdx(null); return; }
    setSlides(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(i, 0, moved);
      return arr;
    });
    setSelectedSlideIdx(i);
    dragIdx.current = null;
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setDragOverIdx(null);
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= slides.length) return;
    setSlides(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
    setSelectedSlideIdx(newIdx);
  }

  function saveConfig() {
    const config = { brand, slides };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ppt-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadConfig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const config = JSON.parse(text);
    if (config.brand) setBrand(config.brand);
    if (config.slides) { setSlides(config.slides); setStep('edit'); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: brand.primaryColor, color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>PPT 메이커</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['brand', 'content', 'edit'] as Step[]).map((s, i) => (
              <button
                key={s}
                onClick={() => (s === 'edit' ? slides.length > 0 : true) && setStep(s)}
                style={{
                  padding: '4px 12px', borderRadius: 16, border: 'none', fontSize: 13, cursor: 'pointer',
                  background: step === s ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: step === s ? brand.primaryColor : '#fff',
                  fontWeight: step === s ? 600 : 400,
                }}
              >
                {i + 1}. {s === 'brand' ? '디자인' : s === 'content' ? '콘텐츠' : '편집'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveConfig} style={{ padding: '6px 14px', borderRadius: 6, border: '1.5px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
            설정 저장
          </button>
          <button onClick={() => configFileRef.current?.click()} style={{ padding: '6px 14px', borderRadius: 6, border: '1.5px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
            설정 불러오기
          </button>
          <input ref={configFileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={loadConfig} />
          {step === 'edit' && slides.length > 0 && (
            <button onClick={handleDownload} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: brand.accentColor, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              PPTX 다운로드
            </button>
          )}
        </div>
      </header>

      {/* Loading overlay */}
      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 40px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16, color: '#444' }}>{loadingMsg}</div>
          </div>
        </div>
      )}

      {/* Step 1: Brand */}
      {step === 'brand' && (
        <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#222' }}>1단계: 디자인 설정</h2>
          <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>PPT 파일이나 디자인 스크린샷을 업로드하면 색상과 폰트를 자동으로 추출합니다.</p>

          {/* 레퍼런스 업로드 — 두 가지 방식 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#333' }}>레퍼런스 업로드 (선택사항)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* PPTX 업로드 */}
              <div
                onClick={() => refFileRef.current?.click()}
                style={{ border: `2px dashed ${brand.accentColor}`, borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', color: '#888', fontSize: 13 }}
              >
                <div style={{ fontSize: 26, marginBottom: 6 }}>📂</div>
                <div style={{ fontWeight: 600, color: '#444', marginBottom: 4 }}>PPT 파일</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>폰트 · 색상 · 로고 위치 추출</div>
              </div>
              <input ref={refFileRef} type="file" accept=".pptx" style={{ display: 'none' }} onChange={handleReferenceUpload} />

              {/* 이미지 업로드 */}
              <div
                onClick={() => imgRefFileRef.current?.click()}
                style={{ border: `2px dashed #E8A838`, borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', color: '#888', fontSize: 13 }}
              >
                <div style={{ fontSize: 26, marginBottom: 6 }}>🖼️</div>
                <div style={{ fontWeight: 600, color: '#444', marginBottom: 4 }}>디자인 스크린샷</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>PNG · JPG · 웹 캡처 · 시안 이미지</div>
              </div>
              <input ref={imgRefFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageRefUpload} />
            </div>

            {/* 이미지 업로드 후 결과 표시 */}
            {refImagePreview && (
              <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 10, border: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <img
                    src={refImagePreview}
                    alt="레퍼런스"
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    {styleDescription && (
                      <div style={{ fontSize: 13, color: '#444', fontWeight: 600, marginBottom: 10 }}>
                        {styleDescription}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>추출된 색상</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[brand.primaryColor, brand.accentColor, brand.bgColor, ...brand.colors]
                        .filter((c, i, arr) => arr.indexOf(c) === i)
                        .slice(0, 6)
                        .map((color, i) => (
                          <div
                            key={i}
                            title={color}
                            style={{ width: 28, height: 28, borderRadius: 6, background: color, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', cursor: 'pointer' }}
                            onClick={() => setBrand(b => ({ ...b, primaryColor: color }))}
                          />
                        ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>색상 클릭 시 제목 색상으로 적용</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#333' }}>스타일 직접 설정</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                제목 색상
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={brand.primaryColor} onChange={e => setBrand(b => ({ ...b, primaryColor: e.target.value }))} style={{ width: 40, height: 36, borderRadius: 6, border: '1.5px solid #ddd', cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, color: '#aaa' }}>{brand.primaryColor}</span>
                </div>
              </label>
              <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                강조 색상
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={brand.accentColor} onChange={e => setBrand(b => ({ ...b, accentColor: e.target.value }))} style={{ width: 40, height: 36, borderRadius: 6, border: '1.5px solid #ddd', cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, color: '#aaa' }}>{brand.accentColor}</span>
                </div>
              </label>
              <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                배경 색상
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={brand.bgColor} onChange={e => setBrand(b => ({ ...b, bgColor: e.target.value }))} style={{ width: 40, height: 36, borderRadius: 6, border: '1.5px solid #ddd', cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, color: '#aaa' }}>{brand.bgColor}</span>
                </div>
              </label>
              <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                폰트
                <select
                  value={brand.titleFont}
                  onChange={e => setBrand(b => ({ ...b, titleFont: e.target.value, bodyFont: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 14, background: '#fff' }}
                >
                  <option value="Malgun Gothic">맑은 고딕 (권장)</option>
                  <option value="NanumGothic">나눔고딕</option>
                  <option value="Apple SD Gothic Neo">Apple SD Gothic Neo (Mac)</option>
                  <option value="Noto Sans KR">Noto Sans KR</option>
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                </select>
              </label>
              <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                제목 폰트 크기
                <input type="number" value={brand.titleSize} onChange={e => setBrand(b => ({ ...b, titleSize: Number(e.target.value) }))} style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 14 }} />
              </label>
              <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                본문 폰트 크기
                <input type="number" value={brand.bodySize} onChange={e => setBrand(b => ({ ...b, bodySize: Number(e.target.value) }))} style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 14 }} />
              </label>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>미리보기</h3>
            <SlidePreview
              slide={{ id: 'preview', layout: 'bullets', title: '슬라이드 제목 예시', bullets: ['첫 번째 항목', '두 번째 항목', '세 번째 항목'] }}
              brand={brand}
              scale={0.9}
            />
          </div>

          <button
            onClick={() => setStep('content')}
            style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: brand.primaryColor, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            다음: 콘텐츠 입력 →
          </button>
        </div>
      )}

      {/* Step 2: Content */}
      {step === 'content' && (
        <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#222' }}>2단계: 콘텐츠 입력</h2>
          <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>보고서 내용을 붙여넣으면 AI가 슬라이드 구조로 자동 변환합니다.</p>

          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={16}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              placeholder={`보고서 내용을 여기에 붙여넣으세요.\n\n예시:\n2024년 4분기 영업 실적 보고\n\n매출 현황\n- 총 매출: 120억원 (전년 대비 +15%)\n- 주요 제품별 매출: A제품 50억, B제품 40억, C제품 30억\n\n주요 성과\n이번 분기에는 신규 거래처 12개사를 확보하였으며...\n\n향후 계획\n1분기에는 신제품 출시 및 마케팅 확대를 통해...`}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep('brand')} style={{ flex: 1, padding: '12px', borderRadius: 8, border: `2px solid ${brand.primaryColor}`, background: '#fff', color: brand.primaryColor, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              ← 이전
            </button>
            <button
              onClick={handleStructure}
              disabled={!rawText.trim()}
              style={{ flex: 3, padding: '12px', borderRadius: 8, border: 'none', background: rawText.trim() ? brand.primaryColor : '#ccc', color: '#fff', fontSize: 15, fontWeight: 600, cursor: rawText.trim() ? 'pointer' : 'not-allowed' }}
            >
              AI 구조화 시작 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Edit */}
      {step === 'edit' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
          {/* Slide list */}
          <div style={{ width: 200, background: '#fff', borderRight: '1px solid #e0e0e0', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                style={{
                  position: 'relative',
                  opacity: dragIdx.current === i ? 0.4 : 1,
                  borderTop: dragOverIdx === i && dragIdx.current !== i ? `3px solid ${brand.accentColor}` : '3px solid transparent',
                  borderRadius: 6,
                  transition: 'opacity 0.15s',
                  cursor: 'grab',
                }}
              >
                <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 1, background: selectedSlideIdx === i ? brand.accentColor : '#999', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i + 1}
                </div>
                {/* 복제 버튼 — 썸네일 우측 상단 */}
                <button
                  onClick={e => { e.stopPropagation(); duplicateSlide(i); }}
                  title="슬라이드 복제"
                  style={{ position: 'absolute', top: 4, right: 4, zIndex: 2, width: 20, height: 20, borderRadius: 4, border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >
                  ⧉
                </button>
                <SlidePreview
                  slide={slide}
                  brand={brand}
                  scale={0.35}
                  selected={selectedSlideIdx === i}
                  onClick={() => setSelectedSlideIdx(i)}
                />
              </div>
            ))}
            <button
              onClick={addSlide}
              style={{ padding: '8px', borderRadius: 8, border: `2px dashed ${brand.accentColor}`, background: 'transparent', color: brand.accentColor, fontSize: 13, cursor: 'pointer', marginTop: 4 }}
            >
              + 슬라이드 추가
            </button>
          </div>

          {/* Main preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f0f2f5' }}>
            {slides[selectedSlideIdx] && (
              <>
                <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                  <button onClick={() => moveSlide(selectedSlideIdx, -1)} disabled={selectedSlideIdx === 0} style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                    ← 이전으로
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: 13, color: '#666' }}>
                    {selectedSlideIdx + 1} / {slides.length}
                  </span>
                  <button onClick={() => moveSlide(selectedSlideIdx, 1)} disabled={selectedSlideIdx === slides.length - 1} style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                    다음으로 →
                  </button>
                </div>
                <SlidePreview slide={slides[selectedSlideIdx]} brand={brand} scale={1.4} />
              </>
            )}
          </div>

          {/* Editor panel */}
          <div style={{ width: 300, background: '#fff', borderLeft: '1px solid #e0e0e0', overflowY: 'auto', padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#333' }}>슬라이드 편집</h3>
            {slides[selectedSlideIdx] && (
              <SlideEditor
                slide={slides[selectedSlideIdx]}
                brand={brand}
                onChange={updated => updateSlide(selectedSlideIdx, updated)}
                onDelete={() => deleteSlide(selectedSlideIdx)}
                onDuplicate={() => duplicateSlide(selectedSlideIdx)}
              />
            )}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #eee' }}>
              <button
                onClick={handleDownload}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: brand.primaryColor, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                PPTX 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
