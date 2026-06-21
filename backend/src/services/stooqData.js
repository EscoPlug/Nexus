// Server-side Stooq CSV client — daily/weekly/monthly history (no intraday).
import { toStooqSymbol } from './symbols.js';

const STOOQ = 'https://stooq.com';
const INTERVAL_MAP = { '1D': 'd', '1W': 'w', '1M': 'm' };

function parseCsv(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2 || !lines[0].toLowerCase().startsWith('date')) return [];
  const bars = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, o, h, l, c, v] = lines[i].split(',');
    const open = parseFloat(o), high = parseFloat(h), low = parseFloat(l), close = parseFloat(c);
    if ([open, high, low, close].some((n) => !isFinite(n))) continue;
    bars.push({
      time: Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000),
      open, high, low, close,
      volume: Math.round(parseFloat(v) || 0),
    });
  }
  return bars.sort((a, b) => a.time - b.time);
}

export async function stooqCandles(symbol, interval) {
  const i = INTERVAL_MAP[interval];
  if (!i) throw new Error('Stooq: intraday not supported');
  const s = toStooqSymbol(symbol);
  const res = await fetch(`${STOOQ}/q/d/l/?s=${encodeURIComponent(s)}&i=${i}`, {
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  const bars = parseCsv(await res.text());
  if (bars.length === 0) throw new Error('Stooq: no data');
  return bars;
}

export async function stooqQuote(symbol) {
  const bars = await stooqCandles(symbol, '1D');
  if (bars.length < 2) throw new Error('Stooq: insufficient data');
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = last.close - prev.close;
  return {
    symbol: String(symbol).toUpperCase(),
    name: String(symbol).toUpperCase(),
    price: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    prevClose: prev.close,
    volume: last.volume,
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(((change / prev.close) * 100).toFixed(4)),
    exchange: 'Stooq',
    currency: 'USD',
  };
}
