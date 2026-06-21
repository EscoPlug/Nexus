// Finnhub — stocks, forex, and crypto with optional free API key.
// Get a free key at https://finnhub.io (60 calls/minute free tier).
// Set FINNHUB_KEY in backend/.env; without it, this provider is skipped.
import { classifySymbol, cryptoBase, parseForexPair } from './symbols.js';

const BASE = 'https://finnhub.io/api/v1';

function key() { return process.env.FINNHUB_KEY; }
export function isConfigured() { return Boolean(key()); }

async function fhGet(path) {
  if (!isConfigured()) throw new Error('Finnhub: no API key');
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}token=${key()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  return res.json();
}

// Finnhub uses Unix second timestamps for candle from/to
function fromTo(interval) {
  const now = Math.floor(Date.now() / 1000);
  const windows = { '1m': 86400, '5m': 86400, '15m': 86400*2, '30m': 86400*3,
    '1h': 86400*7, '4h': 86400*30, '1D': 86400*60, '1W': 86400*365, '1M': 86400*730 };
  return { to: now, from: now - (windows[interval] ?? 86400*60) };
}

const RES = { '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240', '1D': 'D', '1W': 'W', '1M': 'M' };

function parseCandles(data) {
  if (data.s !== 'ok') throw new Error('Finnhub: no candle data');
  return data.t.map((t, i) => ({
    time: t,
    open: data.o[i], high: data.h[i], low: data.l[i], close: data.c[i],
    volume: Math.round(data.v?.[i] ?? 0),
  })).filter((b) => b.close > 0);
}

export async function finnhubCandles(symbol, interval) {
  const cls = classifySymbol(symbol);
  const res = RES[interval] ?? 'D';
  const { from, to } = fromTo(interval);

  if (cls === 'crypto') {
    const base = cryptoBase(symbol);
    const data = await fhGet(`/crypto/candle?symbol=BINANCE:${base}USDT&resolution=${res}&from=${from}&to=${to}`);
    return parseCandles(data);
  }
  if (cls === 'forex') {
    const p = parseForexPair(symbol);
    if (!p) throw new Error('Finnhub: cannot parse pair');
    const data = await fhGet(`/forex/candle?symbol=OANDA:${p.base}_${p.quote}&resolution=${res}&from=${from}&to=${to}`);
    return parseCandles(data);
  }
  const data = await fhGet(`/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${res}&from=${from}&to=${to}`);
  return parseCandles(data);
}

export async function finnhubQuote(symbol) {
  const cls = classifySymbol(symbol);
  if (cls === 'crypto') {
    const base = cryptoBase(symbol);
    const data = await fhGet(`/crypto/candle?symbol=BINANCE:${base}USDT&resolution=D&from=${Math.floor(Date.now()/1000)-86400*2}&to=${Math.floor(Date.now()/1000)}`);
    const bars = parseCandles(data);
    if (bars.length < 2) throw new Error('Finnhub: not enough crypto bars');
    const last = bars[bars.length-1], prev = bars[bars.length-2];
    const change = last.close - prev.close;
    return {
      symbol: String(symbol).toUpperCase(), name: `${base} / USD`, price: last.close,
      open: last.open, high: last.high, low: last.low, prevClose: prev.close, volume: last.volume,
      change: parseFloat(change.toFixed(4)), changePercent: parseFloat(((change/prev.close)*100).toFixed(4)),
      exchange: 'Finnhub', currency: 'USD',
    };
  }
  const data = await fhGet(`/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!data.c) throw new Error('Finnhub: no quote');
  const price = data.c, change = data.d ?? 0, prevClose = data.pc ?? price;
  return {
    symbol: String(symbol).toUpperCase(), name: String(symbol).toUpperCase(), price,
    open: data.o ?? price, high: data.h ?? price, low: data.l ?? price, prevClose,
    volume: 0, change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat((data.dp ?? 0).toFixed(4)),
    exchange: 'Finnhub', currency: 'USD',
  };
}
