// Alpaca Market Data API — screener and snapshot calls
const DATA_BASE = 'https://data.alpaca.markets';
const KEY_ID = process.env.ALPACA_KEY_ID || '';
const SECRET_KEY = process.env.ALPACA_SECRET_KEY || '';

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
