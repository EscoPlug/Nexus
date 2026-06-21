import { parseForexPair } from '../assetClass';

// ExchangeRate-API open (no key) — CORS-accessible live forex rates.
// Free, no signup: https://open.er-api.com/v6/latest/USD
// 1500 requests/month free. Daily update cadence (ECB sourced).
const BASE = 'https://open.er-api.com/v6/latest';

interface ERResponse { result: string; base_code: string; rates: Record<string, number> }

async function erGet(base: string): Promise<ERResponse> {
  const res = await fetch(`${BASE}/${base}`, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`);
  const data = await res.json() as ERResponse;
  if (data.result !== 'success') throw new Error('ExchangeRate-API: non-success');
  return data;
}

export async function exchangeRateQuote(symbol: string) {
  const pair = parseForexPair(symbol);
  if (!pair) throw new Error('ExchangeRate: cannot parse pair');
  // Fetch rates with base = pair.base, extract pair.quote
  const data = await erGet(pair.base);
  const rate = data.rates[pair.quote];
  if (!rate) throw new Error(`ExchangeRate: no rate for ${pair.quote}`);
  return {
    symbol: symbol.toUpperCase(),
    name: `${pair.base}/${pair.quote}`,
    price: parseFloat(rate.toFixed(6)),
    open: parseFloat(rate.toFixed(6)),
    high: parseFloat(rate.toFixed(6)),
    low: parseFloat(rate.toFixed(6)),
    prevClose: parseFloat(rate.toFixed(6)),
    volume: 0,
    change: 0,
    changePercent: 0,
    exchange: 'ExchangeRate-API',
    currency: pair.quote,
  };
}
