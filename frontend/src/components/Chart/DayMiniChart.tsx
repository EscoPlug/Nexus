import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, type UTCTimestamp } from 'lightweight-charts';
import type { OHLCVBar } from '../../types';

interface Props {
  bars: OHLCVBar[];
  dayName: string;  // e.g. "Mon"
  date: string;     // e.g. "5/12"
  isToday?: boolean;
}

export default function DayMiniChart({ bars, dayName, date, isToday }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  const open = bars[0]?.open ?? 0;
  const close = bars[bars.length - 1]?.close ?? 0;
  const high = bars.reduce((m, b) => Math.max(m, b.high), 0);
  const low = bars.reduce((m, b) => Math.min(m, b.low), Infinity);
  const change = open > 0 ? ((close - open) / open) * 100 : 0;
  const isUp = change >= 0;

  useEffect(() => {
    if (!chartRef.current || bars.length === 0) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#8b949e', fontSize: 9 },
      grid: { vertLines: { color: '#161b22' }, horzLines: { color: '#161b22' } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: CrosshairMode.Hidden },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    series.setData(
      bars.map(b => ({ time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close }))
    );
    chart.timeScale().fitContent();

    const obs = new ResizeObserver(() => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight });
      }
    });
    obs.observe(chartRef.current);

    return () => { obs.disconnect(); chart.remove(); };
  }, [bars]);

  return (
    <div className={`relative bg-[#0d1117] border rounded-xl overflow-hidden flex flex-col ${
      isToday ? 'border-[#1f6feb]' : 'border-[#21262d]'
    }`} style={{ minHeight: '200px' }}>
      {/* Day header */}
      <div className={`flex items-center justify-between px-3 pt-2.5 pb-1.5 flex-shrink-0 ${
        isToday ? 'bg-[#1f6feb]/10' : ''
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-bold leading-none ${isToday ? 'text-[#79c0ff]' : 'text-white'}`}>
            {dayName}
          </span>
          {isToday && (
            <span className="text-[9px] font-semibold bg-[#1f6feb]/30 text-[#79c0ff] px-1.5 py-0.5 rounded">TODAY</span>
          )}
          <span className="text-[10px] text-[#8b949e]">{date}</span>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-white font-mono leading-none">
            {close > 0 ? `$${close.toFixed(2)}` : '—'}
          </div>
          {close > 0 && (
            <div className={`text-[10px] font-bold mt-0.5 ${isUp ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {bars.length > 0 && (
        <div className="flex gap-3 px-3 pb-1 flex-shrink-0">
          <span className="text-[9px] text-[#8b949e]">O <span className="text-[#e6edf3]">${open.toFixed(2)}</span></span>
          <span className="text-[9px] text-[#26a69a]">H <span className="text-[#e6edf3]">${high.toFixed(2)}</span></span>
          <span className="text-[9px] text-[#ef5350]">L <span className="text-[#e6edf3]">${low === Infinity ? '—' : low.toFixed(2)}</span></span>
          <span className="text-[9px] text-[#8b949e]">{bars.length}h</span>
        </div>
      )}

      {/* Chart canvas */}
      {bars.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#484f58] text-[11px]">
          Market closed
        </div>
      ) : (
        <div ref={chartRef} className="flex-1" />
      )}
    </div>
  );
}
