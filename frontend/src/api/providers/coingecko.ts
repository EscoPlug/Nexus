import type { OHLCVBar } from '../../types';
import { toCoingeckoId, cryptoBase } from '../assetClass';

// CoinGecko free API — CORS-enabled crypto fallback (price + OHLC, no volume on OHLC).
// Docs: https://www.coingecko.com/en/api/documentation
const BASE = 'https://api.coingecko.com/api/v3';

// Days of history per timeframe → CoinGecko returns granularity automatically
const DAYS_MAP: Record<string, number> = {
  '1m': 1, '5m': 1, '15m': 1, '30m': 1,
  '1h': 7, '4h': 14, '1D': 30, '1W': 90, '1M': 365,
};

async function cgGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json();
}

export async function coingeckoCandles(symbol: string, interval: string): Promise<OHLCVBar[]> {
  const id = toCoingeckoId(symbol);
  if (!id) throw new Error('CoinGecko: unknown coin');
  const days = DAYS_MAP[interval] || 30;
  const data = (await cgGet(`/coins/${id}/ohlc?vs_currency=usd&days=${days}`)) as number[][];
  if (!Array.isArray(data)) throw new Error('CoinGecko: bad ohlc');

  return data.map((row) => ({
    time: Math.floor(row[0] / 1000),
    open: row[1],
    high: row[2],
    low: row[3],
    close: row[4],
    volume: 0, // CoinGecko OHLC endpoint omits volume
  }));
}

export async function coingeckoQuote(symbol: string) {
  const id = toCoingeckoId(symbol);
  if (!id) throw new Error('CoinGecko: unknown coin');
  const data = (await cgGet(
    `/coins/markets?vs_currency=usd&ids=${id}&price_change_percentage=24h`
  )) as Array<{
    name: string; current_price: number; high_24h: number; low_24h: number;
    total_volume: number; price_change_24h: number; price_change_percentage_24h: number;
    market_cap: number;
  }>;
  const c = data?.[0];
  if (!c) throw new Error('CoinGecko: no market data');
  const price = c.current_price;
  const change = c.price_change_24h ?? 0;
  return {
    symbol: symbol.toUpperCase(),
    name: c.name || `${cryptoBase(symbol)} / USD`,
    price,
    open: price - change,
    high: c.high_24h,
    low: c.low_24h,
    prevClose: price - change,
    volume: Math.round(c.total_volume || 0),
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat((c.price_change_percentage_24h ?? 0).toFixed(4)),
    marketCap: c.market_cap,
    exchange: 'CoinGecko',
    currency: 'USD',
  };
}
