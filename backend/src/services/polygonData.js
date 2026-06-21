// Polygon.io — US stocks and options with optional free API key.
// Get a free key at https://polygon.io (5 calls/minute, previous-day data).
// Set POLYGON_KEY in backend/.env; without it, this provider is skipped.

const BASE = 'https://api.polygon.io';
function key() { return process.env.POLYGON_KEY; }
export function isConfigured() { return Boolean(key()); }

function fmt(ts) { return new Date(ts).toISOString().slice(0, 10); }
const MS_WINDOW = {
  '1m': 86400_000, '5m': 86400_000, '15m': 86400_000*2, '30m': 86400_000*3,
  '1h': 86400_000*7, '4h': 86400_000*30, '1D': 86400_000*60,
  '1W': 86400_000*365, '1M': 86400_000*730,
};
const POLY_MULT = { '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 1, '4h': 4, '1D': 1, '1W': 1, '1M': 1 };
const POLY_SPAN = { '1m': 'minute', '5m': 'minute', '15m': 'minute', '30m': 'minute', '1h': 'hour', '4h': 'hour', '1D': 'day', '1W': 'week', '1M': 'month' };

async function pgGet(path) {
  if (!isConfigured()) throw new Error('Polygon: no API key');
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}apiKey=${key()}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Polygon HTTP ${res.status}`);
  return res.json();
}

export async function polygonCandles(symbol, interval) {
  const now = Date.now();
  const from = fmt(now - (MS_WINDOW[interval] ?? 86400_000*60));
  const to = fmt(now);
  const mult = POLY_MULT[interval] ?? 1;
  const span = POLY_SPAN[interval] ?? 'day';
  const data = await pgGet(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${mult}/${span}/${from}/${to}?adjusted=true&sort=asc&limit=500`);
  if (data.status === 'ERROR') throw new Error(`Polygon: ${data.error}`);
  const results = data.results ?? [];
  if (results.length === 0) throw new Error('Polygon: no candles');
  return results.map((r) => ({
    time: Math.floor(r.t / 1000),
    open: r.o, high: r.h, low: r.l, close: r.c,
    volume: Math.round(r.v ?? 0),
  }));
}

export async function polygonQuote(symbol) {
  const data = await pgGet(`/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}`);
  const snap = data.ticker;
  if (!snap) throw new Error('Polygon: no snapshot');
  const day = snap.day ?? {};
  const prevDay = snap.prevDay ?? {};
  const price = snap.lastTrade?.p ?? day.c ?? 0;
  const prevClose = prevDay.c ?? price;
  const change = price - prevClose;
  return {
    symbol: String(symbol).toUpperCase(),
    name: String(symbol).toUpperCase(),
    price,
    open: day.o ?? price,
    high: day.h ?? price,
    low: day.l ?? price,
    prevClose,
    volume: Math.round(day.v ?? 0),
    change: parseFloat(change.toFixed(4)),
    changePercent: prevClose ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0,
    exchange: 'Polygon',
    currency: 'USD',
  };
}
