// Server-side CryptoCompare — free, no key needed for basic endpoints.
// Aggregates OHLC across 250+ exchanges. https://min-api.cryptocompare.com/
import { cryptoBase } from './symbols.js';

const BASE = 'https://min-api.cryptocompare.com/data/v2';

const HISTO_MAP = {
  '1m':  { endpoint: 'histominute', aggregate: 1,  limit: 390 },
  '5m':  { endpoint: 'histominute', aggregate: 5,  limit: 288 },
  '15m': { endpoint: 'histominute', aggregate: 15, limit: 96  },
  '30m': { endpoint: 'histominute', aggregate: 30, limit: 48  },
  '1h':  { endpoint: 'histohour',   aggregate: 1,  limit: 168 },
  '4h':  { endpoint: 'histohour',   aggregate: 4,  limit: 180 },
  '1D':  { endpoint: 'histoday',    aggregate: 1,  limit: 30  },
  '1W':  { endpoint: 'histoday',    aggregate: 7,  limit: 52  },
  '1M':  { endpoint: 'histoday',    aggregate: 30, limit: 24  },
};

async function ccGet(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CryptoCompare HTTP ${res.status}`);
  return res.json();
}

export async function cryptoCompareCandles(symbol, interval) {
  const fsym = cryptoBase(symbol);
  const { endpoint, aggregate, limit } = HISTO_MAP[interval] ?? HISTO_MAP['1D'];
  const data = await ccGet(`/${endpoint}?fsym=${fsym}&tsym=USD&aggregate=${aggregate}&limit=${limit}`);
  const rows = data?.Data?.Data ?? [];
  return rows
    .filter((r) => r.close > 0)
    .map((r) => ({
      time: r.time,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: Math.round(r.volumeto ?? 0),
    }));
}

export async function cryptoCompareQuote(symbol) {
  const fsym = cryptoBase(symbol);
  const data = await ccGet(`/pricemultifull?fsyms=${fsym}&tsyms=USD`);
  const raw = data?.RAW?.[fsym]?.['USD'];
  if (!raw) throw new Error('CryptoCompare: no data');
  return {
    symbol: String(symbol).toUpperCase(),
    name: `${fsym} / USD`,
    price: raw.PRICE,
    open: raw.OPEN24HOUR,
    high: raw.HIGH24HOUR,
    low: raw.LOW24HOUR,
    prevClose: raw.OPEN24HOUR,
    volume: Math.round(raw.TOTALVOLUME24H ?? 0),
    change: parseFloat((raw.CHANGE24HOUR ?? 0).toFixed(4)),
    changePercent: parseFloat((raw.CHANGEPCT24HOUR ?? 0).toFixed(4)),
    marketCap: raw.MKTCAP,
    exchange: 'CryptoCompare',
    currency: 'USD',
  };
}
