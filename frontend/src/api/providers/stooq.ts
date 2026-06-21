import type { OHLCVBar } from '../../types';
import { classifySymbol, toStooqSymbol } from '../assetClass';

// Stooq — free daily/weekly/monthly CSV history for stocks, forex, crypto, indices.
// No intraday on the free CSV endpoint. Served through a CORS proxy from the browser.
const STOOQ = 'https://stooq.com';
const PROXY = 'https://corsproxy.io/?url=';

// Only daily-and-up intervals are supported; intraday callers should fall back.
const INTERVAL_MAP: Record<string, string> = {
  '1D': 'd', '1W': 'w', '1M': 'm',
};

function supports(interval: string): boolean {
  return interval in INTERVAL_MAP;
}

async function fetchCsv(url: string): Promise<string> {
  // Try direct first, then via CORS proxy
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) return res.text();
  } catch {
    /* fall through to proxy */
  }
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  return res.text();
}

function parseCsv(csv: string): OHLCVBar[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  if (!header.startsWith('date')) return []; // error page / no data
  const bars: OHLCVBar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 5) continue;
    const [date, o, h, l, c, v] = cols;
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

export async function stooqCandles(symbol: string, interval: string): Promise<OHLCVBar[]> {
  if (!supports(interval)) throw new Error('Stooq: intraday not supported');
  const cls = classifySymbol(symbol);
  const s = toStooqSymbol(symbol, cls);
  const i = INTERVAL_MAP[interval];
  const csv = await fetchCsv(`${STOOQ}/q/d/l/?s=${encodeURIComponent(s)}&i=${i}`);
  const bars = parseCsv(csv);
  if (bars.length === 0) throw new Error('Stooq: no data');
  return bars;
}

export async function stooqQuote(symbol: string) {
  const bars = await stooqCandles(symbol, '1D');
  if (bars.length < 2) throw new Error('Stooq: insufficient data');
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = last.close - prev.close;
  return {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
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
