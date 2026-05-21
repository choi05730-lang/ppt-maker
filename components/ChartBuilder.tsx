'use client';
import { useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { BrandStyle, ChartData } from '@/types';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
);

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

interface SheetData {
  headers: string[];
  rows: (string | number)[][];
}

interface Recommendation {
  chartType: ChartType;
  labelColumn: number;
  dataColumns: number[];
  title: string;
  reasoning: string;
}

interface Props {
  brand: BrandStyle;
  onInsert: (imageDataUrl: string, title: string, chartData: ChartData) => void;
  onClose: () => void;
}

const CHART_LABELS: Record<ChartType, string> = {
  bar: '막대 차트',
  line: '라인 차트',
  pie: '파이 차트',
  doughnut: '도넛 차트',
};

export default function ChartBuilder({ brand, onInsert, onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'configure' | 'preview'>('upload');
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<Record<string, SheetData>>({});
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [labelCol, setLabelCol] = useState(0);
  const [dataCols, setDataCols] = useState<number[]>([1]);
  const [chartTitle, setChartTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const current = sheetData[selectedSheet];

  // 브랜드 색상 팔레트 생성
  function getPalette(count: number): string[] {
    const base = [
      brand.primaryColor,
      brand.accentColor,
      '#E8A838', '#5BA85F', '#C0504D', '#9B59B6',
      '#1ABC9C', '#E74C3C', '#3498DB', '#F39C12',
    ];
    return Array.from({ length: count }, (_, i) => base[i % base.length]);
  }

  function buildChartData() {
    if (!current) return null;
    const labels = current.rows.map(r => String(r[labelCol] ?? ''));
    const colors = getPalette(dataCols.length);
    const datasets = dataCols.map((col, i) => ({
      label: current.headers[col] ?? `데이터 ${i + 1}`,
      data: current.rows.map(r => {
        const v = r[col];
        return typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')) || 0;
      }),
      backgroundColor: chartType === 'bar'
        ? colors[i] + 'CC'
        : colors.slice(0, current.rows.length),
      borderColor: chartType === 'line' ? colors[i] : undefined,
      borderWidth: chartType === 'line' ? 2.5 : 1,
      fill: false,
      tension: 0.3,
      pointRadius: chartType === 'line' ? 4 : undefined,
    }));
    return { labels, datasets };
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { family: brand.titleFont, size: 12 } } },
      title: {
        display: !!chartTitle,
        text: chartTitle,
        font: { family: brand.titleFont, size: 16, weight: 'bold' as const },
        color: brand.primaryColor,
      },
    },
    scales: chartType === 'bar' || chartType === 'line' ? {
      x: { ticks: { font: { family: brand.bodyFont, size: 11 } } },
      y: { ticks: { font: { family: brand.bodyFont, size: 11 } } },
    } : undefined,
  };

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setLoadingMsg('엑셀 파일 분석 중...');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/parse-excel', { method: 'POST', body: fd });
    if (res.ok) {
      const { sheets: s, data } = await res.json();
      setSheets(s);
      setSheetData(data);
      setSelectedSheet(s[0]);
      setStep('configure');
    }
    setLoading(false);
    setLoadingMsg('');
  }

  async function handleAIRecommend() {
    if (!current) return;
    setLoading(true);
    setLoadingMsg('AI가 데이터 분석 중...');
    const res = await fetch('/api/recommend-chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers: current.headers, rows: current.rows }),
    });
    if (res.ok) {
      const r: Recommendation = await res.json();
      setRec(r);
      setChartType(r.chartType);
      setLabelCol(r.labelColumn);
      setDataCols(r.dataColumns);
      setChartTitle(r.title);
      setStep('preview');
    }
    setLoading(false);
    setLoadingMsg('');
  }

  function handleInsert() {
    const canvas = chartContainerRef.current?.querySelector('canvas');
    if (!canvas || !current) return;
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const chartData: ChartData = {
      type: chartType,
      title: chartTitle,
      labels: current.rows.map(r => String(r[labelCol] ?? '')),
      datasets: dataCols.map(col => ({
        name: current.headers[col] ?? `데이터 ${col + 1}`,
        values: current.rows.map(r => {
          const v = r[col];
          return typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')) || 0;
        }),
      })),
    };
    onInsert(dataUrl, chartTitle, chartData);
  }

  const data = buildChartData();

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: 680, maxHeight: '90vh',
        overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#222' }}>엑셀 차트 삽입</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {step === 'upload' ? '1. 파일 업로드' : step === 'configure' ? '2. 데이터 설정' : '3. 미리보기 & 삽입'}
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
              <div style={{ color: '#666' }}>{loadingMsg}</div>
            </div>
          )}

          {/* Step 1: Upload */}
          {!loading && step === 'upload' && (
            <label style={{
              display: 'block', border: `2px dashed ${brand.accentColor}`, borderRadius: 10,
              padding: '48px 24px', textAlign: 'center', cursor: 'pointer', color: '#888',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 15, marginBottom: 6, color: '#444' }}>엑셀 파일을 클릭해서 업로드</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>.xlsx, .xls 파일 지원</div>
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          )}

          {/* Step 2: Configure */}
          {!loading && step === 'configure' && current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Sheet selector */}
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

              {/* Data preview */}
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>데이터 미리보기</div>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #eee' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {current.headers.map((h, i) => (
                          <th key={i} style={{ padding: '8px 12px', background: brand.primaryColor, color: '#fff', textAlign: 'left', whiteSpace: 'nowrap' }}>
                            {h || `열 ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {current.rows.slice(0, 5).map((row, ri) => (
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
                {current.rows.length > 5 && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>... 외 {current.rows.length - 5}행 더 있음</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleAIRecommend}
                  style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: brand.primaryColor, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  AI 차트 자동 추천 →
                </button>
                <button
                  onClick={() => { setChartTitle(current.headers[1] ?? '차트'); setStep('preview'); }}
                  style={{ padding: '12px 16px', borderRadius: 8, border: `1.5px solid ${brand.accentColor}`, background: '#fff', color: brand.accentColor, fontSize: 14, cursor: 'pointer' }}
                >
                  직접 설정
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {!loading && step === 'preview' && current && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* AI reasoning */}
              {rec && (
                <div style={{ background: '#f0f7ff', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#2E75B6', borderLeft: `3px solid ${brand.accentColor}` }}>
                  AI 추천: {rec.reasoning}
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  차트 타입
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(Object.keys(CHART_LABELS) as ChartType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setChartType(t)}
                        style={{
                          padding: '5px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                          border: `2px solid ${chartType === t ? brand.accentColor : '#ddd'}`,
                          background: chartType === t ? brand.accentColor : '#fff',
                          color: chartType === t ? '#fff' : '#555',
                          fontWeight: chartType === t ? 600 : 400,
                        }}
                      >
                        {CHART_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </label>
                <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  차트 제목
                  <input
                    value={chartTitle}
                    onChange={e => setChartTitle(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 13 }}
                  />
                </label>
                <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  라벨 열
                  <select
                    value={labelCol}
                    onChange={e => setLabelCol(Number(e.target.value))}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1.5px solid #ddd', fontSize: 13 }}
                  >
                    {current.headers.map((h, i) => <option key={i} value={i}>{h || `열 ${i + 1}`}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 13, color: '#666', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  데이터 열 (복수 선택)
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {current.headers.map((h, i) => i !== labelCol && (
                      <button
                        key={i}
                        onClick={() => setDataCols(prev =>
                          prev.includes(i) ? prev.filter(c => c !== i) : [...prev, i]
                        )}
                        style={{
                          padding: '4px 8px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                          border: `2px solid ${dataCols.includes(i) ? brand.accentColor : '#ddd'}`,
                          background: dataCols.includes(i) ? brand.accentColor : '#fff',
                          color: dataCols.includes(i) ? '#fff' : '#555',
                        }}
                      >
                        {h || `열 ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              {/* Chart preview */}
              <div ref={chartContainerRef} style={{ background: '#fafafa', borderRadius: 10, padding: 20, border: '1px solid #eee' }}>
                {chartType === 'bar' && <Bar data={data as any} options={chartOptions} />}
                {chartType === 'line' && <Line data={data as any} options={chartOptions} />}
                {chartType === 'pie' && <Pie data={data as any} options={{ ...chartOptions, scales: undefined }} />}
                {chartType === 'doughnut' && <Doughnut data={data as any} options={{ ...chartOptions, scales: undefined }} />}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep('configure')}
                  style={{ padding: '12px 20px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', color: '#555', fontSize: 14, cursor: 'pointer' }}
                >
                  ← 다시 설정
                </button>
                <button
                  onClick={handleInsert}
                  style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: brand.primaryColor, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  슬라이드에 삽입
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
