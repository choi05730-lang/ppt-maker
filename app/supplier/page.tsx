'use client';

import { useState, useRef, useCallback } from 'react';
import type { SupplierRaw } from '@/lib/supplier-types';

type Step = 'upload' | 'select' | 'generating' | 'done';

const GRADE_COLOR: Record<string, string> = {
  S: 'bg-purple-100 text-purple-700',
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-green-100 text-green-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-red-100 text-red-700',
};

export default function SupplierPage() {
  const [step, setStep] = useState<Step>('upload');
  const [suppliers, setSuppliers] = useState<SupplierRaw[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseExcel = useCallback(async (file: File) => {
    setError('');
    setProgress('Excel 파싱 중...');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/supplier/parse', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Parse failed');
    return data.suppliers as SupplierRaw[];
  }, []);

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await parseExcel(file);
      setSuppliers(result);
      setSelected(new Set());
      setStep('select');
      setProgress('');
    } catch (e) {
      setError(String(e));
      setProgress('');
    }
  }, [parseExcel]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const active = suppliers.filter(s => !s.isExcluded);
    setSelected(new Set(active.map(s => s.id)));
  };

  const clearAll = () => setSelected(new Set());

  const generate = async () => {
    const chosen = suppliers.filter(s => selected.has(s.id));
    if (!chosen.length) return;

    setStep('generating');
    setProgress(`번역 & 슬라이드 생성 중... (${chosen.length}개 공급사, Claude API 호출)`);
    setError('');

    try {
      const res = await fetch('/api/supplier/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suppliers: chosen }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'supplier-info.pptx';
      a.click();
      URL.revokeObjectURL(url);
      setStep('done');
      setProgress('');
    } catch (e) {
      setError(String(e));
      setStep('select');
      setProgress('');
    }
  };

  const reset = () => {
    setStep('upload');
    setSuppliers([]);
    setSelected(new Set());
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const activeSuppliers = suppliers.filter(s => !s.isExcluded);
  const excludedSuppliers = suppliers.filter(s => s.isExcluded);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Supplier Info Slide Generator</h1>
            <p className="text-sm text-gray-500 mt-0.5">Excel → PPT 자동 생성 (Claude AI 번역)</p>
          </div>
          {step !== 'upload' && (
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              처음부터
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {(['upload', 'select', 'done'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-300">→</span>}
              <span
                className={`px-3 py-1 rounded-full font-medium ${
                  step === s || (step === 'generating' && s === 'select')
                    ? 'bg-blue-600 text-white'
                    : step === 'done' || (i < ['upload', 'select', 'done'].indexOf(step))
                    ? 'bg-gray-200 text-gray-600'
                    : 'text-gray-400'
                }`}
              >
                {s === 'upload' ? '① Excel 업로드' : s === 'select' ? '② 공급사 선택' : '③ 완료'}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium text-gray-700">
              Excel 파일을 드래그하거나 클릭해서 업로드
            </p>
            <p className="text-sm text-gray-400 mt-2">
              ★raw meat supplier inspection result Score.xlsx
            </p>
            <p className="text-xs text-gray-400 mt-1">
              "Final ver." 시트에서 공급사 데이터를 자동으로 파싱합니다
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
          </div>
        )}

        {/* STEP 2: Select suppliers */}
        {(step === 'select' || step === 'generating') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  공급사 선택 <span className="text-blue-600">({selected.size}개 선택)</span>
                </h2>
                <p className="text-sm text-gray-500">PPT 슬라이드를 생성할 공급사를 선택하세요</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  전체 선택
                </button>
                <button
                  onClick={clearAll}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  초기화
                </button>
              </div>
            </div>

            {/* Active suppliers */}
            <div className="grid gap-2 mb-6">
              {activeSuppliers.map(s => (
                <label
                  key={s.id}
                  className={`flex items-start gap-3 p-4 bg-white border rounded-lg cursor-pointer transition-colors ${
                    selected.has(s.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GRADE_COLOR[s.grade] || 'bg-gray-100 text-gray-600'}`}>
                        {s.grade} ({s.totalScore.toFixed(1)}점)
                      </span>
                      {s.vendor && (
                        <span className="text-xs text-gray-500">벤더: {s.vendor}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {s.location} · {s.mainCate || '-'} · {s.totalSku} SKU
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Excluded suppliers */}
            {excludedSuppliers.length > 0 && (
              <details className="mb-6">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                  제외된 공급사 {excludedSuppliers.length}개 (out)
                </summary>
                <div className="mt-2 grid gap-1">
                  {excludedSuppliers.map(s => (
                    <div key={s.id} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-400 line-through">
                      {s.name}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Generate button */}
            <div className="sticky bottom-6">
              <button
                onClick={generate}
                disabled={selected.size === 0 || step === 'generating'}
                className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base shadow-lg"
              >
                {step === 'generating' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {progress}
                  </span>
                ) : (
                  `PPT 생성하기 (${selected.size}개 슬라이드)`
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 'done' && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">PPT 생성 완료!</h2>
            <p className="text-gray-500 mb-8">
              supplier-info.pptx 파일이 다운로드되었습니다
            </p>
            <button
              onClick={reset}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
            >
              다시 생성하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
