import type { OHLCVBar } from '../types';

const YF = 'https://query1.finance.yahoo.com';
const YF2 = 'https://query2.finance.yahoo.com';
const PROXY = 'https://corsproxy.io/?url=';

const INTERVAL_MAP: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '60m', '4h': '1h', '1D': '1d', '1W': '1wk', '1M': '1mo',
};
const RANGE_MAP: Record<string, string> = {
  '1m': '1d',   // 1 trading day
  '5m': '1d',   // 1 trading day
  '15m': '1d',  // 1 trading day
  '30m': '1d',  // 1 trading day
  '1h': '5d',   // 1 week
  '4h': '1mo',  // 1 month
  '1D': '5d',   // 1 week of daily bars
  '1W': '6mo',  // 6 months
  '1M': '2y',   // 2 years
};

async function yfGet(path: string, useProxy = false): Promise<unknown> {
  const base = useProxy ? `${PROXY}${encodeURIComponent(YF)}` : YF;
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    mode: useProxy ? 'cors' : 'cors',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function yfGetWithFallback(path: string): Promise<unknown> {
  // Try direct first, then proxy on failure
  try {
    return await yfGet(path, false);
  } catch {
    try {
      return await yfGet(path, true);
    } catch {
      // Try query2 domain
      const url = `${YF2}${path}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
  }
}

export async function yahooCandles(symbol: string, interval: string): Promise<OHLCVBar[]> {
  const yfInterval = INTERVAL_MAP[interval] || '1d';
  const yfRange = RANGE_MAP[interval] || '1y';
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${yfInterval}&range=${yfRange}&includePrePost=false&events=div%2Csplit`;

  const data = await yfGetWithFallback(path) as {
    chart: { result: Array<{
      timestamp: number[];
      indicators: { quote: Array<{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }> };
    }> | null; error: null | { description: string } };
  };

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(data?.chart?.error?.description || 'No data');

  const timestamps = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || { open: [], high: [], low: [], close: [], volume: [] };

  return timestamps
    .map((t, i) => ({
      time: t,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i] || 0,
    }))
    .filter(c => c.open != null && c.high != null && c.low != null && c.close != null)
    .map(c => ({
      time: c.time,
      open: parseFloat(c.open.toFixed(4)),
      high: parseFloat(c.high.toFixed(4)),
      low: parseFloat(c.low.toFixed(4)),
      close: parseFloat(c.close.toFixed(4)),
      volume: Math.round(c.volume),
    }));
}

export async function yahooQuote(symbol: string) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const data = await yfGetWithFallback(path) as {
    chart: { result: Array<{ meta: Record<string, unknown>; timestamp: number[]; indicators: { quote: Array<{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }> } }> | null };
  };

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('No quote data');

  const meta = result.meta as Record<string, unknown>;
  const q = result.indicators?.quote?.[0] || { open: [], high: [], low: [], close: [], volume: [] };
  const lastIdx = (result.timestamp?.length || 1) - 1;
  const prevIdx = lastIdx - 1;

  const price = (meta.regularMarketPrice as number) ?? q.close[lastIdx];
  const prevClose = (meta.previousClose as number) ?? (meta.chartPreviousClose as number) ?? q.close[prevIdx];
  const change = price && prevClose ? price - prevClose : 0;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    name: (meta.longName as string) || (meta.shortName as string) || symbol,
    price,
    open: (meta.regularMarketDayOpen as number) ?? q.open[lastIdx],
    high: (meta.regularMarketDayHigh as number) ?? q.high[lastIdx],
    low: (meta.regularMarketDayLow as number) ?? q.low[lastIdx],
    prevClose,
    volume: (meta.regularMarketVolume as number) ?? q.volume[lastIdx],
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(changePercent.toFixed(4)),
    marketCap: meta.marketCap as number | undefined,
    exchange: (meta.fullExchangeName as string) || (meta.exchangeName as string) || '',
    currency: (meta.currency as string) || 'USD',
  };
}

export async function yahooSearch(query: string) {
  const path = `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&enableFuzzyQuery=true`;
  const data = await yfGetWithFallback(path) as {
    finance?: { result?: Array<{ quotes?: Array<{ symbol: string; longname?: string; shortname?: string; quoteType?: string; exchDisp?: string; exchange?: string }> }> };
  };

  return (data?.finance?.result?.[0]?.quotes || [])
    .filter(r => r.symbol && !['OPTION'].includes(r.quoteType || ''))
    .map(r => ({
      symbol: r.symbol,
      name: r.longname || r.shortname || r.symbol,
      type: r.quoteType || 'EQUITY',
      exchange: r.exchDisp || r.exchange || '',
    }));
}

export async function yahooNews(symbol?: string) {
  const q = symbol || 'stock market';
  const path = `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=10`;
  const data = await yfGetWithFallback(path) as {
    finance?: { result?: Array<{ news?: Array<{ uuid: string; title: string; publisher: string; link: string; providerPublishTime: number; thumbnail?: { resolutions?: Array<{ url: string }> } }> }> };
  };

  return (data?.finance?.result?.[0]?.news || []).map(n => ({
    id: n.uuid || String(Math.random()),
    title: n.title,
    publisher: n.publisher,
    link: n.link,
    publishedAt: n.providerPublishTime,
    thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
    relatedSymbols: [] as string[],
  }));
}
