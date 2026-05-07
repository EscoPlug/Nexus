import { useState, useEffect, useRef } from 'react';

export interface LiveTick {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800,
};

// Annualised volatility per symbol (used for realistic intrabar movement)
const VOLS: Record<string, number> = {
  AAPL: 0.22, MSFT: 0.20, GOOGL: 0.24, GOOG: 0.24, AMZN: 0.26,
  NVDA: 0.55, TSLA: 0.65, META: 0.35, NFLX: 0.35, AMD: 0.50,
  INTC: 0.35, CRM: 0.30, ORCL: 0.25, JPM: 0.22, BAC: 0.25,
  GS: 0.25, V: 0.18, MA: 0.20, JNJ: 0.14, UNH: 0.20,
  LLY: 0.28, WMT: 0.16, MCD: 0.16, SPY: 0.14, QQQ: 0.18,
  IWM: 0.18, GLD: 0.14, '^GSPC': 0.14, '^DJI': 0.13, '^IXIC': 0.18,
  '^VIX': 0.80, '^TNX': 0.20, 'BTC-USD': 0.80, 'ETH-USD': 0.90,
  'SOL-USD': 1.0, 'GC=F': 0.15, 'CL=F': 0.30, 'EUR=X': 0.07,
};

function boxMullerNormal(): number {
  const u = Math.random() || 1e-10;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

export function useLiveTick(
  symbol: string,
  interval: string,
  lastBar: { time: number; close: number } | null
): LiveTick | null {
  const [tick, setTick] = useState<LiveTick | null>(null);
  const tickRef = useRef<LiveTick | null>(null);
  // Read lastBar inside effect via ref so we don't restart the timer on every bar refetch
  const lastBarRef = useRef(lastBar);
  lastBarRef.current = lastBar;

  useEffect(() => {
    const lb = lastBarRef.current;
    if (!lb || lb.close <= 0) { setTick(null); return; }

    const intervalSec = INTERVAL_SECONDS[interval] || 86400;
    const annualVol = VOLS[symbol.toUpperCase()] ?? 0.25;

    // Geometric Brownian Motion: annualised vol scaled to per-second dt
    // barDt = fraction of trading year per bar; tickDt = per-second fraction
    const barsPerYear = (252 * 86400) / intervalSec;
    const barDt = 1 / barsPerYear;
    const tickDt = barDt / intervalSec;

    // Average share volume per second (rough estimate)
    const avgVolPerSec = Math.max(1, Math.round((50_000_000 / Math.max(1, lb.close)) / intervalSec));

    // Live bar immediately follows the last historical bar
    const liveTime = lb.time + intervalSec;
    const initial: LiveTick = {
      time: liveTime,
      open: lb.close,
      high: lb.close,
      low: lb.close,
      close: lb.close,
      volume: 0,
    };
    tickRef.current = initial;
    setTick(initial);

    const id = setInterval(() => {
      const s = tickRef.current!;
      const z = boxMullerNormal();
      const logReturn = -0.5 * annualVol ** 2 * tickDt + annualVol * Math.sqrt(tickDt) * z;
      const newClose = Math.max(s.close * Math.exp(logReturn), 0.01);

      const updated: LiveTick = {
        time: s.time,
        open: s.open,
        high: Math.max(s.high, newClose),
        low: Math.min(s.low, newClose),
        close: newClose,
        volume: s.volume + Math.max(1, Math.round(avgVolPerSec * (0.3 + Math.random() * 1.4))),
      };
      tickRef.current = updated;
      setTick({ ...updated });
    }, 1000);

    return () => clearInterval(id);
  // Only restart when symbol or timeframe changes, not on every bar refetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  return tick;
}
