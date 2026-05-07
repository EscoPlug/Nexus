import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  symbol: string;
  currentPrice: number;
}

type Condition = 'uptick' | 'downtick' | 'same';

interface Print {
  id: number;
  time: Date;
  price: number;
  size: number;
  condition: Condition;
}

const SIZES = [100, 200, 300, 500, 1000, 2000, 5000];

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function conditionColor(c: Condition): string {
  if (c === 'uptick') return '#3fb950';
  if (c === 'downtick') return '#f85149';
  return '#c9d1d9';
}

export const TimeAndSales: React.FC<Props> = ({ symbol, currentPrice }) => {
  const [prints, setPrints] = useState<Print[]>([]);

  // Refs to avoid stale closures
  const driftRef = useRef<number>(currentPrice);
  const lastPriceRef = useRef<number>(currentPrice);
  const idRef = useRef<number>(0);
  const currentPriceRef = useRef<number>(currentPrice);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync when prop changes
  useEffect(() => {
    currentPriceRef.current = currentPrice;
    driftRef.current = currentPrice;
    lastPriceRef.current = currentPrice;
  }, [currentPrice]);

  const schedulePrint = useCallback(() => {
    const base = currentPriceRef.current;

    // Random walk, clamped to ±0.02 of current price
    const walk = (Math.random() - 0.5) * 0.04;
    let rawPrice = driftRef.current + walk;
    rawPrice = Math.max(base - 0.02, Math.min(base + 0.02, rawPrice));
    const price = Math.round(rawPrice * 100) / 100;

    const prev = lastPriceRef.current;
    const condition: Condition =
      price > prev ? 'uptick' : price < prev ? 'downtick' : 'same';

    driftRef.current = price;
    lastPriceRef.current = price;

    const size = SIZES[Math.floor(Math.random() * SIZES.length)];
    const print: Print = {
      id: idRef.current++,
      time: new Date(),
      price,
      size,
      condition,
    };

    setPrints((prev) => {
      const next = [print, ...prev];
      if (next.length > 200) next.length = 200;
      return next;
    });

    // Dynamic interval: 150–600 ms
    const delay = 150 + Math.random() * 450;
    timeoutRef.current = setTimeout(schedulePrint, delay);
  }, []); // intentionally stable — reads from refs

  useEffect(() => {
    const delay = 150 + Math.random() * 450;
    timeoutRef.current = setTimeout(schedulePrint, delay);
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, [schedulePrint]);

  const visible = prints.slice(0, 50);

  return (
    <div
      className="flex flex-col h-full font-mono text-xs select-none"
      style={{ backgroundColor: '#0d1117', color: '#c9d1d9' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: '#21262d', backgroundColor: '#161b22' }}
      >
        <span className="font-semibold tracking-wide" style={{ color: '#c9d1d9' }}>
          Time &amp; Sales — {symbol}
        </span>
        <span className="flex items-center gap-1.5" style={{ color: '#8b949e' }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: '#3fb950' }}
          />
          Live
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid grid-cols-3 px-3 py-1 border-b flex-shrink-0"
        style={{ borderColor: '#21262d', backgroundColor: '#161b22' }}
      >
        <span style={{ color: '#8b949e' }}>Time</span>
        <span className="text-right" style={{ color: '#8b949e' }}>Price</span>
        <span className="text-right" style={{ color: '#8b949e' }}>Size</span>
      </div>

      {/* Rows — newest at top, auto-scrolled by virtue of prepend */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {visible.length === 0 && (
          <div className="px-3 py-6 text-center" style={{ color: '#8b949e' }}>
            Waiting for prints…
          </div>
        )}
        {visible.map((p) => {
          const color = conditionColor(p.condition);
          const large = p.size >= 1000;
          return (
            <div
              key={p.id}
              className="grid grid-cols-3 px-3 py-[3px] border-b"
              style={{ borderColor: '#21262d' }}
            >
              <span style={{ color: '#8b949e' }}>{formatTime(p.time)}</span>
              <span
                className={`text-right${large ? ' font-bold' : ''}`}
                style={{ color }}
              >
                {p.price.toFixed(2)}
              </span>
              <span
                className={`text-right${large ? ' font-bold' : ''}`}
                style={{ color }}
              >
                {p.size.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeAndSales;
