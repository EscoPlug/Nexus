import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, type UTCTimestamp } from 'lightweight-charts';
import { useChartData } from '../../hooks/useChartData';
import type { Timeframe } from '../../types';

interface Props {
  symbol: string;
  name: string;
  timeframe: Timeframe;
  onClick: () => void;
}

export default function MiniChart({ symbol, name, timeframe, onClick }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { bars, quote, loading } = useChartData(symbol, timeframe);

  const price = quote?.price ?? bars[bars.length - 1]?.close ?? 0;
  const change = quote?.changePercent ?? 0;
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
      priceScaleId: 'right',
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
    <div
      onClick={onClick}
      className="relative bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden cursor-pointer active:border-[#1f6feb] hover:border-[#30363d] transition-colors flex flex-col"
      style={{ height: '140px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-2.5 pt-2 pb-1 flex-shrink-0">
        <div>
          <div className="text-[12px] font-bold text-white leading-none">{symbol}</div>
          <div className="text-[9px] text-[#8b949e] mt-0.5 truncate max-w-[80px]">{name}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-white font-mono leading-none">
            {price > 0 ? `$${price.toFixed(2)}` : '—'}
          </div>
          <div className={`text-[10px] font-bold mt-0.5 ${isUp ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
            {price > 0 ? `${isUp ? '+' : ''}${change.toFixed(2)}%` : ''}
          </div>
        </div>
      </div>

      {/* Chart canvas */}
      {loading && bars.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-4 h-4 border border-[#1f6feb] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div ref={chartRef} className="flex-1" />
      )}
    </div>
  );
}
