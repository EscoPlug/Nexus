import type { OHLCVBar } from '../types';
import { yahooCandles, yahooQuote, yahooSearch, yahooNews } from './yahoo';
import { simCandles, simQuote, SIM_SEARCH_DB } from './simulation';

export type DataSource = 'backend' | 'yahoo' | 'simulated';

let resolvedSource: DataSource | null = null;

async function detectSource(): Promise<DataSource> {
  if (resolvedSource) return resolvedSource;

  // 1. Try local backend (works on local dev)
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
    if (res.ok) { resolvedSource = 'backend'; return 'backend'; }
  } catch {}

  // 2. Try Yahoo Finance directly from the browser
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) { resolvedSource = 'yahoo'; return 'yahoo'; }
  } catch {}

  // 3. Try Yahoo Finance via CORS proxy
  try {
    const url = encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d');
    const res = await fetch(`https://corsproxy.io/?url=${url}`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) { resolvedSource = 'yahoo'; return 'yahoo'; }
  } catch {}

  resolvedSource = 'simulated';
  return 'simulated';
}

export async function getDataSource(): Promise<DataSource> {
  return detectSource();
}

export async function fetchCandles(symbol: string, interval: string): Promise<{ bars: OHLCVBar[]; source: DataSource }> {
  const source = await detectSource();

  if (source === 'backend') {
    try {
      const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
      if (res.ok) {
        const data = await res.json();
        return { bars: data.candles || [], source: 'backend' };
      }
    } catch {}
  }

  if (source === 'yahoo' || source === 'backend') {
    try {
      const bars = await yahooCandles(symbol, interval);
      if (bars.length > 0) { resolvedSource = 'yahoo'; return { bars, source: 'yahoo' }; }
    } catch {}
  }

  return { bars: simCandles(symbol, interval), source: 'simulated' };
}

export async function fetchQuote(symbol: string) {
  const source = await detectSource();

  if (source === 'backend') {
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  if (source === 'yahoo' || source === 'backend') {
    try {
      return await yahooQuote(symbol);
    } catch {}
  }

  return simQuote(symbol);
}

export async function fetchSearch(query: string) {
  const source = await detectSource();

  if (source === 'backend') {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch {}
  }

  if (source === 'yahoo' || source === 'backend') {
    try {
      const results = await yahooSearch(query);
      if (results.length > 0) return results;
    } catch {}
  }

  const q = query.toLowerCase();
  return SIM_SEARCH_DB.filter(s =>
    s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  ).slice(0, 15);
}

export async function fetchNews(symbol?: string) {
  const source = await detectSource();

  if (source === 'backend') {
    try {
      const url = symbol ? `/api/news?symbol=${encodeURIComponent(symbol)}` : '/api/news';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.news || [];
      }
    } catch {}
  }

  if (source === 'yahoo' || source === 'backend') {
    try {
      const news = await yahooNews(symbol);
      if (news.length > 0) return news;
    } catch {}
  }

  // Fallback static news
  const now = Math.floor(Date.now() / 1000);
  const headlines = [
    { title: 'Markets Rally as Fed Signals Rate Cut Ahead', publisher: 'Reuters' },
    { title: 'Tech Stocks Surge on Strong Earnings Reports', publisher: 'Bloomberg' },
    { title: 'S&P 500 Hits New Record High Amid Optimism', publisher: 'CNBC' },
    { title: 'AI Investment Boom Continues to Drive Growth', publisher: 'Financial Times' },
    { title: 'Bond Yields Fall as Inflation Data Cools', publisher: 'WSJ' },
    { title: 'Crypto Market Sees Major Inflows This Week', publisher: 'CoinDesk' },
    { title: 'Oil Prices Stabilize After Geopolitical Tensions', publisher: 'Reuters' },
    { title: 'Gold Hits Multi-Year High on Safe Haven Demand', publisher: 'Bloomberg' },
    { title: 'Consumer Spending Remains Resilient Despite Rates', publisher: 'CNBC' },
    { title: 'Semiconductor Cycle Recovery Drives Chip Stocks Higher', publisher: 'MarketWatch' },
  ];
  return headlines.map((h, i) => ({
    id: `static-${i}`,
    title: symbol ? `${symbol} — ${h.title}` : h.title,
    publisher: h.publisher,
    link: '#',
    publishedAt: now - i * 3600,
    thumbnail: null,
    relatedSymbols: symbol ? [symbol] : [],
  }));
}

export async function fetchMarkets() {
  const symbols = ['^GSPC', '^DJI', '^IXIC', '^VIX', 'GC=F', 'CL=F', 'BTC-USD', 'ETH-USD', 'EUR=X', '^TNX'];
  const source = await detectSource();

  if (source === 'backend') {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        return data.markets || [];
      }
    } catch {}
  }

  if (source === 'yahoo' || source === 'backend') {
    try {
      const results = await Promise.allSettled(symbols.map(s => yahooQuote(s)));
      const markets = results
        .map((r, i) => r.status === 'fulfilled' && r.value
          ? { symbol: symbols[i], name: r.value.name, price: r.value.price, change: r.value.change, changePercent: r.value.changePercent }
          : null
        )
        .filter(Boolean);
      if (markets.length > 0) return markets;
    } catch {}
  }

  return symbols.map(sym => {
    const q = simQuote(sym);
    return q ? { symbol: sym, name: q.name, price: q.price, change: q.change, changePercent: q.changePercent } : null;
  }).filter(Boolean);
}
