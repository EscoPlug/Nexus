import type { OHLCVBar } from '../../types';
import { cryptoBase } from '../assetClass';

// Kraken public REST API — real OHLC klines, no key needed.
// Docs: https://docs.kraken.com/rest/#tag/Market-Data
const BASE = 'https://api.kraken.com/0/public';

// Kraken uses legacy XBT for BTC, and X-prefix for older alts
const PAIR_MAP: Record<string, string> = {
  BTC: 'XXBTZUSD', ETH: 'XETHZUSD', XRP: 'XXRPZUSD', LTC: 'XLTCZUSD',
  DOGE: 'XDGUSD', ADA: 'ADAUSD', SOL: 'SOLUSD', DOT: 'DOTUSD',
  LINK: 'LINKUSD', ATOM: 'ATOMUSD', AVAX: 'AVAXUSD', MATIC: 'MATICUSD',
  UNI: 'UNIUSD', NEAR: 'NEARUSD', ARB: 'ARBUSD', OP: 'OPUSD',
  FIL: 'FILUSD', ETC: 'XETCZUSD', XLM: 'XXLMZUSD', TRX: 'TRXUSD',
  SHIB: 'SHIBUSD', APT: 'APTUSD', INJ: 'INJUSD',
};

const INTERVAL_MAP: Record<string, number> = {
  '1m': 1, '5m': 5, '15m': 15, '30m': 30,
  '1h': 60, '4h': 240, '1D': 1440, '1W': 10080,
};

export function toKrakenPair(symbol: string): string {
  const base = cryptoBase(symbol);
  return PAIR_MAP[base] || `${base}USD`;
}

async function kGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
  const data = await res.json() as { error: string[]; result?: unknown };
  if (data.error?.length) throw new Error(`Kraken: ${data.error[0]}`);
  return data.result;
}

export async function krakenCandles(symbol: string, interval: string): Promise<OHLCVBar[]> {
  const pair = toKrakenPair(symbol);
  const itv = INTERVAL_MAP[interval] ?? 1440;
  const result = await kGet(`/OHLC?pair=${pair}&interval=${itv}`) as Record<string, unknown[][]>;
  // Result key is the pair name (may differ slightly); grab first non-"last" key
  const key = Object.keys(result).find((k) => k !== 'last');
  if (!key) throw new Error('Kraken: no OHLC key');
  const rows = result[key] as (string | number)[][];
  return rows
    .filter((r) => r.length >= 6)
    .map((r) => ({
      time: Number(r[0]),
      open: parseFloat(String(r[1])),
      high: parseFloat(String(r[2])),
      low: parseFloat(String(r[3])),
      close: parseFloat(String(r[4])),
      volume: parseFloat(String(r[6])),
    }))
    .filter((b) => b.close > 0);
}

export async function krakenQuote(symbol: string) {
  const pair = toKrakenPair(symbol);
  const result = await kGet(`/Ticker?pair=${pair}`) as Record<string, {
    c: [string, string]; o: string; h: [string, string]; l: [string, string]; v: [string, string];
  }>;
  const key = Object.keys(result)[0];
  const t = result[key];
  const price = parseFloat(t.c[0]);
  const open = parseFloat(t.o);
  const change = price - open;
  const base = cryptoBase(symbol);
  return {
    symbol: symbol.toUpperCase(),
    name: `${base} / USD`,
    price,
    open,
    high: parseFloat(t.h[0]),
    low: parseFloat(t.l[0]),
    prevClose: open,
    volume: Math.round(parseFloat(t.v[1])),
    change: parseFloat(change.toFixed(4)),
    changePercent: open ? parseFloat(((change / open) * 100).toFixed(4)) : 0,
    exchange: 'Kraken',
    currency: 'USD',
  };
}
