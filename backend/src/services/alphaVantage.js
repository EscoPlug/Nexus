// Alpha Vantage — stocks, forex, and crypto with optional free API key.
// Get a free key at https://www.alphavantage.co/support/#api-key (500 calls/day).
// Set ALPHA_VANTAGE_KEY in backend/.env; without it, this provider is skipped.
import { classifySymbol, cryptoBase, parseForexPair } from './symbols.js';

const BASE = 'https://www.alphavantage.co/query';

function key() {
  return process.env.ALPHA_VANTAGE_KEY;
}

export function isConfigured() {
  return Boolean(key());
}

async function avGet(params) {
  if (!isConfigured()) throw new Error('Alpha Vantage: no API key');
  const qs = new URLSearchParams({ ...params, apikey: key() }).toString();
  const res = await fetch(`${BASE}?${qs}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const data = await res.json();
  if (data['Error Message'] || data['Note']) throw new Error(data['Error Message'] || data['Note']);
  return data;
}

// Map our timeframe to AV interval
const AV_INTRADAY = { '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', '1h': '60min' };

export async function avCandles(symbol, interval) {
  const cls = classifySymbol(symbol);
  let series, tsKey, priceKey;

  if (cls === 'crypto') {
    const fsym = cryptoBase(symbol);
    if (AV_INTRADAY[interval]) {
      const data = await avGet({ function: 'CRYPTO_INTRADAY', symbol: fsym, market: 'USD', interval: AV_INTRADAY[interval], outputsize: 'compact' });
      tsKey = `Time Series Crypto (${AV_INTRADAY[interval]})`;
      priceKey = null;
      const ts = data[tsKey]; if (!ts) throw new Error('AV crypto intraday: no data');
      return Object.entries(ts).slice(0, 300).reverse().map(([t, v]) => ({
        time: Math.floor(new Date(t + 'Z').getTime() / 1000),
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: Math.round(parseFloat(v['5. volume'] ?? 0)),
      }));
    }
    const data = await avGet({ function: 'DIGITAL_CURRENCY_DAILY', symbol: fsym, market: 'USD' });
    const ts = data['Time Series (Digital Currency Daily)']; if (!ts) throw new Error('AV crypto: no data');
    return Object.entries(ts).slice(0, 60).reverse().map(([t, v]) => ({
      time: Math.floor(new Date(t + 'T00:00:00Z').getTime() / 1000),
      open: parseFloat(v['1. open']),
      high: parseFloat(v['2. high']),
      low: parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
      volume: Math.round(parseFloat(v['5. volume'] ?? 0)),
    }));
  }

  if (cls === 'forex') {
    const p = parseForexPair(symbol);
    if (!p) throw new Error('AV forex: cannot parse pair');
    if (AV_INTRADAY[interval]) {
      const data = await avGet({ function: 'FX_INTRADAY', from_symbol: p.base, to_symbol: p.quote, interval: AV_INTRADAY[interval], outputsize: 'compact' });
      const ts = data[`Time Series FX (${AV_INTRADAY[interval]})`]; if (!ts) throw new Error('AV forex intraday: no data');
      return Object.entries(ts).slice(0, 300).reverse().map(([t, v]) => ({
        time: Math.floor(new Date(t + 'Z').getTime() / 1000),
        open: parseFloat(v['1. open']), high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']), close: parseFloat(v['4. close']), volume: 0,
      }));
    }
    const data = await avGet({ function: 'FX_DAILY', from_symbol: p.base, to_symbol: p.quote, outputsize: 'compact' });
    const ts = data['Time Series FX (Daily)']; if (!ts) throw new Error('AV forex: no data');
    return Object.entries(ts).slice(0, 60).reverse().map(([t, v]) => ({
      time: Math.floor(new Date(t + 'T00:00:00Z').getTime() / 1000),
      open: parseFloat(v['1. open']), high: parseFloat(v['2. high']),
      low: parseFloat(v['3. low']), close: parseFloat(v['4. close']), volume: 0,
    }));
  }

  // Equity / ETF / Index
  if (AV_INTRADAY[interval]) {
    const data = await avGet({ function: 'TIME_SERIES_INTRADAY', symbol, interval: AV_INTRADAY[interval], outputsize: 'compact' });
    const ts = data[`Time Series (${AV_INTRADAY[interval]})`]; if (!ts) throw new Error('AV intraday: no data');
    return Object.entries(ts).slice(0, 300).reverse().map(([t, v]) => ({
      time: Math.floor(new Date(t + 'Z').getTime() / 1000),
      open: parseFloat(v['1. open']), high: parseFloat(v['2. high']),
      low: parseFloat(v['3. low']), close: parseFloat(v['4. close']),
      volume: Math.round(parseFloat(v['5. volume'] ?? 0)),
    }));
  }
  const fn = interval === '1W' ? 'TIME_SERIES_WEEKLY_ADJUSTED' : interval === '1M' ? 'TIME_SERIES_MONTHLY_ADJUSTED' : 'TIME_SERIES_DAILY_ADJUSTED';
  const data = await avGet({ function: fn, symbol, outputsize: 'compact' });
  const tsKey2 = Object.keys(data).find((k) => k.startsWith('Time Series') || k.startsWith('Weekly') || k.startsWith('Monthly'));
  if (!tsKey2) throw new Error('AV: no series key');
  const ts2 = data[tsKey2];
  return Object.entries(ts2).slice(0, 60).reverse().map(([t, v]) => ({
    time: Math.floor(new Date(t + 'T00:00:00Z').getTime() / 1000),
    open: parseFloat(v['1. open']), high: parseFloat(v['2. high']),
    low: parseFloat(v['3. low']),
    close: parseFloat(v['5. adjusted close'] ?? v['4. close']),
    volume: Math.round(parseFloat(v['6. volume'] ?? v['5. volume'] ?? 0)),
  }));
}

export async function avQuote(symbol) {
  const cls = classifySymbol(symbol);
  if (cls === 'forex') {
    const p = parseForexPair(symbol);
    if (!p) throw new Error('AV forex: cannot parse');
    const data = await avGet({ function: 'CURRENCY_EXCHANGE_RATE', from_currency: p.base, to_currency: p.quote });
    const r = data['Realtime Currency Exchange Rate'];
    if (!r) throw new Error('AV forex: no rate');
    const price = parseFloat(r['5. Exchange Rate']);
    return {
      symbol: String(symbol).toUpperCase(), name: `${p.base}/${p.quote}`, price,
      open: price, high: price, low: price, prevClose: price,
      volume: 0, change: 0, changePercent: 0,
      exchange: 'Alpha Vantage', currency: p.quote,
    };
  }
  const data = await avGet({ function: 'GLOBAL_QUOTE', symbol });
  const q = data['Global Quote'];
  if (!q || !q['05. price']) throw new Error('AV: no quote');
  const price = parseFloat(q['05. price']);
  const prevClose = parseFloat(q['08. previous close']);
  const change = parseFloat(q['09. change']);
  return {
    symbol: String(symbol).toUpperCase(),
    name: String(symbol).toUpperCase(),
    price,
    open: parseFloat(q['02. open']),
    high: parseFloat(q['03. high']),
    low: parseFloat(q['04. low']),
    prevClose,
    volume: Math.round(parseFloat(q['06. volume'] ?? 0)),
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(parseFloat(q['10. change percent']).toFixed(4)),
    exchange: 'Alpha Vantage',
    currency: 'USD',
  };
}
