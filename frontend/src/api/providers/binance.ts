import type { OHLCVBar } from '../../types';
import { toBinanceSymbol, cryptoBase } from '../assetClass';

// Binance public market data — CORS-enabled, real OHLC klines + 24h ticker.
// Docs: https://binance-docs.github.io/apidocs/spot/en/
const BASE = 'https://api.binance.com';

const INTERVAL_MAP: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1M',
};

// Bar count per timeframe (crypto trades 24/7, so windows differ from equities)
const LIMITS: Record<string, number> = {
  '1m': 360, '5m': 288, '15m': 96, '30m': 96,
  '1h': 168, '4h': 180, '1D': 30, '1W': 52, '1M': 24,
};

async function bGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  return res.json();
}

export async function binanceCandles(symbol: string, interval: string): Promise<OHLCVBar[]> {
  const pair = toBinanceSymbol(symbol);
  const itv = INTERVAL_MAP[interval] || '1h';
  const limit = LIMITS[interval] || 200;
  const data = (await bGet(`/api/v3/klines?symbol=${pair}&interval=${itv}&limit=${limit}`)) as unknown[];
  if (!Array.isArray(data)) throw new Error('Binance: bad klines');

  return data.map((k) => {
    const row = k as (string | number)[];
    return {
      time: Math.floor(Number(row[0]) / 1000),
      open: parseFloat(String(row[1])),
      high: parseFloat(String(row[2])),
      low: parseFloat(String(row[3])),
      close: parseFloat(String(row[4])),
      volume: Math.round(parseFloat(String(row[5]))),
    };
  });
}

export async function binanceQuote(symbol: string) {
  const pair = toBinanceSymbol(symbol);
  const t = (await bGet(`/api/v3/ticker/24hr?symbol=${pair}`)) as {
    lastPrice: string; openPrice: string; highPrice: string; lowPrice: string;
    prevClosePrice: string; volume: string; priceChange: string; priceChangePercent: string;
  };
  const price = parseFloat(t.lastPrice);
  const base = cryptoBase(symbol);
  return {
    symbol: symbol.toUpperCase(),
    name: `${base} / USD`,
    price,
    open: parseFloat(t.openPrice),
    high: parseFloat(t.highPrice),
    low: parseFloat(t.lowPrice),
    prevClose: parseFloat(t.prevClosePrice) || price - parseFloat(t.priceChange),
    volume: Math.round(parseFloat(t.volume)),
    change: parseFloat(parseFloat(t.priceChange).toFixed(4)),
    changePercent: parseFloat(parseFloat(t.priceChangePercent).toFixed(4)),
    exchange: 'Binance',
    currency: 'USD',
  };
}
