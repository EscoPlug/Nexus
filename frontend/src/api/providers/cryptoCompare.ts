import type { OHLCVBar } from '../../types';
import { cryptoBase } from '../assetClass';

// CryptoCompare — free public API, no key required for basic use.
// Aggregates trade data across 250+ exchanges. Docs: https://min-api.cryptocompare.com/
const BASE = 'https://min-api.cryptocompare.com/data/v2';

interface CCHistoRow { time: number; open: number; high: number; low: number; close: number; volumefrom: number; volumeto: number }
interface CCHisto { Data: { Data: CCHistoRow[] } }
interface CCPrice { RAW: Record<string, Record<string, { PRICE: number; OPEN24HOUR: number; HIGH24HOUR: number; LOW24HOUR: number; CHANGE24HOUR: number; CHANGEPCT24HOUR: number; TOTALVOLUME24H: number; MKTCAP: number }>> }

const HISTO_MAP: Record<string, { endpoint: string; aggregate: number; limit: number }> = {
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

async function ccGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CryptoCompare HTTP ${res.status}`);
  return res.json();
}

export async function cryptoCompareCandles(symbol: string, interval: string): Promise<OHLCVBar[]> {
  const fsym = cryptoBase(symbol);
  const { endpoint, aggregate, limit } = HISTO_MAP[interval] ?? HISTO_MAP['1D'];
  const data = await ccGet(`/${endpoint}?fsym=${fsym}&tsym=USD&aggregate=${aggregate}&limit=${limit}`) as CCHisto;
  const rows = data?.Data?.Data ?? [];
  return rows
    .filter((r) => r.close > 0)
    .map((r) => ({
      time: r.time,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: Math.round(r.volumeto),
    }));
}

export async function cryptoCompareQuote(symbol: string) {
  const fsym = cryptoBase(symbol);
  const data = await ccGet(
    `/pricemultifull?fsyms=${fsym}&tsyms=USD`
  ) as CCPrice;
  const raw = data?.RAW?.[fsym]?.['USD'];
  if (!raw) throw new Error('CryptoCompare: no data');
  return {
    symbol: symbol.toUpperCase(),
    name: `${fsym} / USD`,
    price: raw.PRICE,
    open: raw.OPEN24HOUR,
    high: raw.HIGH24HOUR,
    low: raw.LOW24HOUR,
    prevClose: raw.OPEN24HOUR,
    volume: Math.round(raw.TOTALVOLUME24H),
    change: parseFloat(raw.CHANGE24HOUR.toFixed(4)),
    changePercent: parseFloat(raw.CHANGEPCT24HOUR.toFixed(4)),
    marketCap: raw.MKTCAP,
    exchange: 'CryptoCompare',
    currency: 'USD',
  };
}
