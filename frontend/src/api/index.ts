import type { OHLCVBar } from '../types';
import { yahooCandles, yahooQuote, yahooSearch, yahooNews } from './yahoo';
import { simCandles, simQuote, SIM_SEARCH_DB } from './simulation';
import { classifySymbol } from './assetClass';
import { binanceCandles, binanceQuote } from './providers/binance';
import { coingeckoCandles, coingeckoQuote } from './providers/coingecko';
import { forexCandles, forexQuote } from './providers/forex';
import { stooqCandles, stooqQuote } from './providers/stooq';

export type DataSource =
  | 'backend' | 'yahoo' | 'binance' | 'coingecko' | 'forex' | 'stooq'
  | 'google' | 'investing' | 'simulated';

interface QuoteShape {
  symbol: string; name: string; price: number; open: number; high: number;
  low: number; prevClose: number; volume: number; change: number; changePercent: number;
  marketCap?: number; exchange: string; currency: string;
}

let backendAvailable: boolean | null = null;

async function hasBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
    const data = await res.json().catch(() => null);
    backendAvailable = res.ok && data?.service === 'Nexus Backend';
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

// Run an ordered list of providers, returning the first non-empty result.
async function race<T>(
  steps: Array<{ source: DataSource; run: () => Promise<T> }>,
  isEmpty: (v: T) => boolean
): Promise<{ value: T; source: DataSource } | null> {
  for (const step of steps) {
    try {
      const value = await step.run();
      if (!isEmpty(value)) return { value, source: step.source };
    } catch {
      /* try next provider */
    }
  }
  return null;
}

export async function getDataSource(): Promise<DataSource> {
  return (await hasBackend()) ? 'backend' : 'yahoo';
}

// ── Candles ───────────────────────────────────────────────────────────────

function candleProviders(symbol: string, interval: string) {
  const cls = classifySymbol(symbol);
  const yahoo = { source: 'yahoo' as DataSource, run: () => yahooCandles(symbol, interval) };
  const stooq = { source: 'stooq' as DataSource, run: () => stooqCandles(symbol, interval) };

  if (cls === 'crypto') {
    return [
      { source: 'binance' as DataSource, run: () => binanceCandles(symbol, interval) },
      { source: 'coingecko' as DataSource, run: () => coingeckoCandles(symbol, interval) },
      yahoo, stooq,
    ];
  }
  if (cls === 'forex') {
    return [
      yahoo,
      { source: 'forex' as DataSource, run: () => forexCandles(symbol, interval) },
      stooq,
    ];
  }
  return [yahoo, stooq];
}

export async function fetchCandles(symbol: string, interval: string): Promise<{ bars: OHLCVBar[]; source: DataSource }> {
  if (await hasBackend()) {
    try {
      const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
      if (res.ok) {
        const data = await res.json();
        const bars: OHLCVBar[] = data.candles || [];
        if (bars.length > 0) return { bars, source: (data.source as DataSource) || 'backend' };
      }
    } catch {
      /* fall back to direct providers */
    }
  }

  const result = await race(candleProviders(symbol, interval), (b: OHLCVBar[]) => b.length === 0);
  if (result) return { bars: result.value, source: result.source };
  return { bars: simCandles(symbol, interval), source: 'simulated' };
}

// ── Quote ─────────────────────────────────────────────────────────────────

function quoteProviders(symbol: string) {
  const cls = classifySymbol(symbol);
  const yahoo = { source: 'yahoo' as DataSource, run: () => yahooQuote(symbol) };
  const stooq = { source: 'stooq' as DataSource, run: () => stooqQuote(symbol) };

  if (cls === 'crypto') {
    return [
      { source: 'binance' as DataSource, run: () => binanceQuote(symbol) },
      { source: 'coingecko' as DataSource, run: () => coingeckoQuote(symbol) },
      yahoo, stooq,
    ];
  }
  if (cls === 'forex') {
    return [yahoo, { source: 'forex' as DataSource, run: () => forexQuote(symbol) }, stooq];
  }
  return [yahoo, stooq];
}

async function fetchQuoteWithSource(symbol: string): Promise<{ quote: QuoteShape; source: DataSource }> {
  if (await hasBackend()) {
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.price) return { quote: data as QuoteShape, source: (data.source as DataSource) || 'backend' };
      }
    } catch {
      /* fall back */
    }
  }

  const result = await race(quoteProviders(symbol), (q) => !q || !(q as QuoteShape).price);
  if (result) return { quote: result.value as QuoteShape, source: result.source };
  return { quote: simQuote(symbol) as QuoteShape, source: 'simulated' };
}

export async function fetchQuote(symbol: string) {
  const { quote } = await fetchQuoteWithSource(symbol);
  return quote;
}

// ── Search ──────────────────────────────────────────────────────────────────

export async function fetchSearch(query: string) {
  if (await hasBackend()) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if ((data.results || []).length > 0) return data.results;
      }
    } catch {
      /* fall back */
    }
  }

  try {
    const results = await yahooSearch(query);
    if (results.length > 0) return results;
  } catch {
    /* fall back */
  }

  const q = query.toLowerCase();
  return SIM_SEARCH_DB.filter(
    (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  ).slice(0, 15);
}

// ── News ──────────────────────────────────────────────────────────────────

export async function fetchNews(symbol?: string) {
  if (await hasBackend()) {
    try {
      const url = symbol ? `/api/news?symbol=${encodeURIComponent(symbol)}` : '/api/news';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if ((data.news || []).length > 0) return data.news;
      }
    } catch {
      /* fall back */
    }
  }

  try {
    const news = await yahooNews(symbol);
    if (news.length > 0) return news;
  } catch {
    /* fall back */
  }

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

// ── Markets (ticker) ────────────────────────────────────────────────────────

export async function fetchMarkets() {
  const symbols = ['^GSPC', '^DJI', '^IXIC', '^VIX', 'GC=F', 'CL=F', 'BTC-USD', 'ETH-USD', 'EUR=X', '^TNX'];

  if (await hasBackend()) {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        if ((data.markets || []).length > 0) return data.markets;
      }
    } catch {
      /* fall back */
    }
  }

  // Route each symbol through its best provider chain (crypto→Binance, forex→Yahoo, …)
  const results = await Promise.allSettled(symbols.map((s) => fetchQuoteWithSource(s)));
  const markets = results
    .map((r, i) =>
      r.status === 'fulfilled' && r.value.quote?.price
        ? {
            symbol: symbols[i],
            name: r.value.quote.name,
            price: r.value.quote.price,
            change: r.value.quote.change,
            changePercent: r.value.quote.changePercent,
          }
        : null
    )
    .filter(Boolean);
  if (markets.length > 0) return markets;

  return symbols
    .map((sym) => {
      const q = simQuote(sym);
      return q ? { symbol: sym, name: q.name, price: q.price, change: q.change, changePercent: q.changePercent } : null;
    })
    .filter(Boolean);
}
