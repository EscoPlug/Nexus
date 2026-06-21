// Alpaca Market Data API — screener, snapshots, historical bars, and quotes
const DATA_BASE = 'https://data.alpaca.markets';
const KEY_ID = process.env.ALPACA_KEY_ID || '';
const SECRET_KEY = process.env.ALPACA_SECRET_KEY || '';

export function isConfigured() {
  return Boolean(KEY_ID && SECRET_KEY);
}

function headers() {
  return { 'APCA-API-KEY-ID': KEY_ID, 'APCA-API-SECRET-KEY': SECRET_KEY };
}

async function dataFetch(path) {
  const res = await fetch(`${DATA_BASE}${path}`, { headers: headers() });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data.message || `Alpaca Data ${res.status}: ${path}`);
  return data;
}

// Top gainers and losers for the day
export async function getTopMovers(top = 50) {
  const data = await dataFetch(`/v2/screener/stocks/top-movers?market_type=stocks&top=${top}`);
  return { gainers: data.gainers || [], losers: data.losers || [] };
}

// Most active stocks by volume or trade count
export async function getMostActives(by = 'volume', top = 50) {
  const data = await dataFetch(`/v2/screener/stocks/most-actives?by=${by}&top=${top}`);
  return data.most_actives || [];
}

// Latest snapshots for a list of symbols (price, daily bar, prev bar)
export async function getSnapshots(symbols) {
  if (!symbols.length) return {};
  const joined = encodeURIComponent(symbols.join(','));
  const data = await dataFetch(`/v2/stocks/snapshots?symbols=${joined}&feed=iex`);
  return data;
}

// ── Historical bars + quotes (chart data provider) ──────────────────────────

const TIMEFRAME_MAP = {
  '1m': '1Min', '5m': '5Min', '15m': '15Min', '30m': '30Min',
  '1h': '1Hour', '4h': '4Hour', '1D': '1Day', '1W': '1Week', '1M': '1Month',
};

// Calendar-day lookback window per timeframe
const WINDOW_DAYS = {
  '1m': 2, '5m': 4, '15m': 7, '30m': 10,
  '1h': 14, '4h': 60, '1D': 120, '1W': 730, '1M': 1825,
};

function startISO(interval) {
  const days = WINDOW_DAYS[interval] ?? 120;
  return new Date(Date.now() - days * 86400_000).toISOString();
}

function mapBars(rows) {
  return (rows || [])
    .filter((b) => b && b.c > 0)
    .map((b) => ({
      time: Math.floor(new Date(b.t).getTime() / 1000),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: Math.round(b.v ?? 0),
    }));
}

// Yahoo BTC-USD → Alpaca crypto pair BTC/USD
function toCryptoPair(symbol) {
  const base = String(symbol).toUpperCase().replace(/-USD[T]?$/, '');
  return `${base}/USD`;
}

export async function getStockBars(symbol, interval) {
  const tf = TIMEFRAME_MAP[interval] || '1Day';
  const data = await dataFetch(
    `/v2/stocks/${encodeURIComponent(symbol)}/bars?timeframe=${tf}&start=${encodeURIComponent(startISO(interval))}&limit=1000&feed=iex&adjustment=raw`
  );
  const bars = mapBars(data.bars);
  if (bars.length === 0) throw new Error('Alpaca: no stock bars');
  return bars;
}

export async function getCryptoBars(symbol, interval) {
  const tf = TIMEFRAME_MAP[interval] || '1Day';
  const pair = toCryptoPair(symbol);
  const data = await dataFetch(
    `/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(pair)}&timeframe=${tf}&start=${encodeURIComponent(startISO(interval))}&limit=1000`
  );
  const bars = mapBars(data.bars?.[pair]);
  if (bars.length === 0) throw new Error('Alpaca: no crypto bars');
  return bars;
}

export async function getStockQuote(symbol) {
  const data = await dataFetch(`/v2/stocks/${encodeURIComponent(symbol)}/snapshot?feed=iex`);
  const price = data.latestTrade?.p ?? data.dailyBar?.c;
  if (!price) throw new Error('Alpaca: no stock quote');
  const prevClose = data.prevDailyBar?.c ?? data.dailyBar?.o ?? price;
  const change = price - prevClose;
  const d = data.dailyBar ?? {};
  return {
    symbol: String(symbol).toUpperCase(),
    name: String(symbol).toUpperCase(),
    price,
    open: d.o ?? price,
    high: d.h ?? price,
    low: d.l ?? price,
    prevClose,
    volume: Math.round(d.v ?? 0),
    change: parseFloat(change.toFixed(4)),
    changePercent: prevClose ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0,
    exchange: 'Alpaca (IEX)',
    currency: 'USD',
  };
}

export async function getCryptoQuote(symbol) {
  const pair = toCryptoPair(symbol);
  const data = await dataFetch(`/v1beta3/crypto/us/snapshots?symbols=${encodeURIComponent(pair)}`);
  const snap = data.snapshots?.[pair];
  if (!snap) throw new Error('Alpaca: no crypto snapshot');
  const price = snap.latestTrade?.p ?? snap.dailyBar?.c;
  if (!price) throw new Error('Alpaca: no crypto price');
  const prevClose = snap.prevDailyBar?.c ?? snap.dailyBar?.o ?? price;
  const change = price - prevClose;
  const d = snap.dailyBar ?? {};
  return {
    symbol: String(symbol).toUpperCase(),
    name: `${pair.split('/')[0]} / USD`,
    price,
    open: d.o ?? price,
    high: d.h ?? price,
    low: d.l ?? price,
    prevClose,
    volume: Math.round(d.v ?? 0),
    change: parseFloat(change.toFixed(4)),
    changePercent: prevClose ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0,
    exchange: 'Alpaca Crypto',
    currency: 'USD',
  };
}
