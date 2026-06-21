import type { OHLCVBar } from '../../types';
import { parseForexPair } from '../assetClass';

// Frankfurter — free, no-key, CORS-enabled forex rates sourced from the ECB.
// Daily granularity only (business days). Docs: https://www.frankfurter.app/docs/
const BASE = 'https://api.frankfurter.app';

// Calendar days of history to request per timeframe
const DAYS_MAP: Record<string, number> = {
  '1m': 30, '5m': 30, '15m': 30, '30m': 30,
  '1h': 60, '4h': 120, '1D': 30, '1W': 365, '1M': 1460,
};

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  return res.json();
}

export async function forexCandles(symbol: string, interval: string): Promise<OHLCVBar[]> {
  const pair = parseForexPair(symbol);
  if (!pair) throw new Error('Forex: cannot parse pair');
  const days = DAYS_MAP[interval] || 60;
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);

  const data = (await fGet(
    `/${fmt(start)}..${fmt(end)}?from=${pair.base}&to=${pair.quote}`
  )) as { rates: Record<string, Record<string, number>> };

  const entries = Object.entries(data.rates || {})
    .map(([date, r]) => ({ date, rate: r[pair.quote] }))
    .filter((e) => typeof e.rate === 'number')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (entries.length === 0) throw new Error('Forex: no rates');

  // ECB publishes one reference rate/day → synthesize directional candles
  const bars: OHLCVBar[] = [];
  for (let i = 0; i < entries.length; i++) {
    const close = entries[i].rate;
    const open = i > 0 ? entries[i - 1].rate : close;
    bars.push({
      time: Math.floor(new Date(entries[i].date + 'T00:00:00Z').getTime() / 1000),
      open: parseFloat(open.toFixed(6)),
      high: parseFloat(Math.max(open, close).toFixed(6)),
      low: parseFloat(Math.min(open, close).toFixed(6)),
      close: parseFloat(close.toFixed(6)),
      volume: 0,
    });
  }
  return bars;
}

export async function forexQuote(symbol: string) {
  const pair = parseForexPair(symbol);
  if (!pair) throw new Error('Forex: cannot parse pair');

  // Latest + a short series for previous-close comparison
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400_000);
  const data = (await fGet(
    `/${fmt(start)}..${fmt(end)}?from=${pair.base}&to=${pair.quote}`
  )) as { rates: Record<string, Record<string, number>> };

  const entries = Object.entries(data.rates || {})
    .map(([date, r]) => r[pair.quote])
    .filter((v) => typeof v === 'number');
  if (entries.length === 0) throw new Error('Forex: no rates');

  const price = entries[entries.length - 1];
  const prevClose = entries.length > 1 ? entries[entries.length - 2] : price;
  const change = price - prevClose;
  return {
    symbol: symbol.toUpperCase(),
    name: `${pair.base}/${pair.quote}`,
    price: parseFloat(price.toFixed(6)),
    open: prevClose,
    high: Math.max(price, prevClose),
    low: Math.min(price, prevClose),
    prevClose,
    volume: 0,
    change: parseFloat(change.toFixed(6)),
    changePercent: prevClose ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0,
    exchange: 'ECB',
    currency: pair.quote,
  };
}
