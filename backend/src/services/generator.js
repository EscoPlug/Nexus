/* Realistic financial data generator using Geometric Brownian Motion.
   Seeded by symbol so the same symbol always yields the same data. */

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return h >>> 0;
}

function randn(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const PROFILES = {
  // Large-cap tech
  'AAPL':  { price: 185,    vol: 0.22, drift: 0.12, name: 'Apple Inc.' },
  'MSFT':  { price: 415,    vol: 0.20, drift: 0.15, name: 'Microsoft Corp.' },
  'GOOGL': { price: 175,    vol: 0.24, drift: 0.10, name: 'Alphabet Inc.' },
  'GOOG':  { price: 176,    vol: 0.24, drift: 0.10, name: 'Alphabet Inc. (C)' },
  'AMZN':  { price: 188,    vol: 0.26, drift: 0.14, name: 'Amazon.com Inc.' },
  'NVDA':  { price: 880,    vol: 0.55, drift: 0.35, name: 'NVIDIA Corp.' },
  'TSLA':  { price: 172,    vol: 0.65, drift: 0.05, name: 'Tesla Inc.' },
  'META':  { price: 508,    vol: 0.35, drift: 0.20, name: 'Meta Platforms' },
  'NFLX':  { price: 625,    vol: 0.35, drift: 0.12, name: 'Netflix Inc.' },
  'AMD':   { price: 155,    vol: 0.50, drift: 0.18, name: 'Advanced Micro Devices' },
  'INTC':  { price: 32,     vol: 0.35, drift: -0.05, name: 'Intel Corp.' },
  'CRM':   { price: 295,    vol: 0.30, drift: 0.10, name: 'Salesforce Inc.' },
  'ORCL':  { price: 135,    vol: 0.25, drift: 0.12, name: 'Oracle Corp.' },
  // Finance
  'JPM':   { price: 205,    vol: 0.22, drift: 0.12, name: 'JPMorgan Chase' },
  'BAC':   { price: 42,     vol: 0.25, drift: 0.08, name: 'Bank of America' },
  'GS':    { price: 465,    vol: 0.25, drift: 0.12, name: 'Goldman Sachs' },
  'V':     { price: 278,    vol: 0.18, drift: 0.12, name: 'Visa Inc.' },
  'MA':    { price: 480,    vol: 0.20, drift: 0.12, name: 'Mastercard Inc.' },
  // Healthcare
  'JNJ':   { price: 148,    vol: 0.14, drift: 0.06, name: 'Johnson & Johnson' },
  'UNH':   { price: 560,    vol: 0.20, drift: 0.12, name: 'UnitedHealth Group' },
  'LLY':   { price: 745,    vol: 0.28, drift: 0.25, name: 'Eli Lilly & Co.' },
  // Consumer
  'AMZN':  { price: 188,    vol: 0.26, drift: 0.14, name: 'Amazon.com Inc.' },
  'WMT':   { price: 68,     vol: 0.16, drift: 0.10, name: 'Walmart Inc.' },
  'MCD':   { price: 295,    vol: 0.16, drift: 0.08, name: "McDonald's Corp." },
  // ETFs
  'SPY':   { price: 524,    vol: 0.14, drift: 0.10, name: 'SPDR S&P 500 ETF' },
  'QQQ':   { price: 445,    vol: 0.18, drift: 0.12, name: 'Invesco QQQ Trust' },
  'IWM':   { price: 208,    vol: 0.18, drift: 0.08, name: 'iShares Russell 2000' },
  'GLD':   { price: 214,    vol: 0.14, drift: 0.08, name: 'SPDR Gold Shares' },
  // Indices
  '^GSPC': { price: 5300,   vol: 0.14, drift: 0.10, name: 'S&P 500' },
  '^DJI':  { price: 39500,  vol: 0.13, drift: 0.08, name: 'Dow Jones Industrial' },
  '^IXIC': { price: 16800,  vol: 0.18, drift: 0.12, name: 'NASDAQ Composite' },
  '^RUT':  { price: 2080,   vol: 0.18, drift: 0.08, name: 'Russell 2000' },
  '^VIX':  { price: 18,     vol: 0.80, drift: -0.20, name: 'CBOE Volatility Index' },
  '^TNX':  { price: 4.35,   vol: 0.20, drift: 0.00, name: '10-Year Treasury Yield' },
  // Crypto
  'BTC-USD': { price: 68000, vol: 0.80, drift: 0.50, name: 'Bitcoin USD' },
  'ETH-USD': { price: 3800,  vol: 0.90, drift: 0.40, name: 'Ethereum USD' },
  'SOL-USD': { price: 155,   vol: 1.00, drift: 0.60, name: 'Solana USD' },
  'BNB-USD': { price: 540,   vol: 0.70, drift: 0.30, name: 'BNB USD' },
  // Commodities / Futures
  'GC=F':  { price: 2350,   vol: 0.15, drift: 0.08, name: 'Gold Futures' },
  'CL=F':  { price: 78,     vol: 0.30, drift: 0.05, name: 'Crude Oil Futures' },
  'SI=F':  { price: 27,     vol: 0.25, drift: 0.06, name: 'Silver Futures' },
  // Forex
  'EUR=X': { price: 1.082,  vol: 0.07, drift: 0.00, name: 'EUR/USD' },
  'GBP=X': { price: 1.268,  vol: 0.08, drift: 0.00, name: 'GBP/USD' },
  'JPY=X': { price: 153.5,  vol: 0.08, drift: 0.00, name: 'USD/JPY' },
};

const INTERVAL_SECONDS = {
  '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800, '1M': 2592000,
};

const RANGE_BARS = {
  '1m':  390,   // 1 trading day
  '5m':  78,    // 1 trading day
  '15m': 26,    // 1 trading day
  '30m': 13,    // 1 trading day
  '1h':  35,    // 1 week
  '4h':  30,    // ~1 month
  '1D':  5,     // 1 week
  '1W':  52,    // 1 year
  '1M':  24,    // 2 years
};

function getProfile(symbol) {
  const p = PROFILES[symbol.toUpperCase()];
  if (p) return p;
  // Generate consistent profile from hash
  const h = strHash(symbol);
  const r = mulberry32(h);
  return {
    price: 10 + r() * 490,
    vol: 0.15 + r() * 0.45,
    drift: -0.05 + r() * 0.20,
    name: symbol,
  };
}

export function generateCandles(symbol, interval = '1D') {
  const profile = getProfile(symbol);
  const rand = mulberry32(strHash(symbol + interval));

  const numBars = RANGE_BARS[interval] || 500;
  const intervalSec = INTERVAL_SECONDS[interval] || 86400;
  const dt = 1 / 252; // daily fraction of year

  // Adjust vol/drift for sub-daily bars
  const barsPerDay = 86400 / intervalSec;
  const barDt = dt / Math.max(barsPerDay, 1);

  // Start from now going backwards
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - numBars * intervalSec;

  // Work backwards from current price to starting price for consistency
  let price = profile.price;

  // Generate forward from starting price
  const mu = profile.drift;
  const sigma = profile.vol;

  const bars = [];
  let t = startTime;

  for (let i = 0; i < numBars; i++) {
    // GBM: S(t+dt) = S(t) * exp((mu - sigma^2/2) * dt + sigma * sqrt(dt) * Z)
    const z = randn(rand);
    const logReturn = (mu - 0.5 * sigma * sigma) * barDt + sigma * Math.sqrt(barDt) * z;
    const open = price;
    const closeRaw = open * Math.exp(logReturn);

    // Intraday range using ATR approximation
    const atrFraction = sigma * Math.sqrt(barDt) * (1.5 + rand() * 1.0);
    const rangeHalf = open * atrFraction;

    const high = Math.max(open, closeRaw) + rangeHalf * rand();
    const low = Math.min(open, closeRaw) - rangeHalf * rand();

    // Volume: correlated with |log return|, randomized
    const baseVolume = 50_000_000 / Math.max(1, open);
    const volMultiplier = 0.5 + rand() * 1.5 + Math.abs(logReturn) * 5;
    const volume = Math.round(baseVolume * volMultiplier);

    bars.push({
      time: t,
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(closeRaw.toFixed(4)),
      volume,
    });

    price = closeRaw;
    t += intervalSec;

    // Skip weekends for daily+ bars
    if (interval === '1D' || interval === '1W') {
      const d = new Date(t * 1000);
      while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
        t += 86400;
        d.setTime(t * 1000);
      }
    }
  }

  return bars;
}

export function generateQuote(symbol) {
  const profile = getProfile(symbol);
  const bars = generateCandles(symbol, '1D');
  if (bars.length < 2) return null;

  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];

  const change = last.close - prev.close;
  const changePercent = (change / prev.close) * 100;

  // Simulate slight real-time price movement
  const jitter = (Math.random() - 0.5) * 0.002 * last.close;
  const price = last.close + jitter;

  return {
    symbol: symbol.toUpperCase(),
    name: profile.name,
    price: parseFloat(price.toFixed(4)),
    open: last.open,
    high: last.high,
    low: last.low,
    prevClose: prev.close,
    volume: last.volume,
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(changePercent.toFixed(4)),
    marketCap: price > 1 ? Math.round(price * 1e9 * (0.5 + Math.random())) : undefined,
    exchange: 'Nexus Market Data',
    currency: symbol.includes('=X') ? 'FX' : symbol.endsWith('-USD') ? 'USD' : 'USD',
  };
}

const ALL_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'INTC', name: 'Intel Corp.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'CRM', name: 'Salesforce Inc.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'ORCL', name: 'Oracle Corp.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'BAC', name: 'Bank of America Corp.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'GS', name: 'Goldman Sachs Group', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'MA', name: 'Mastercard Inc.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'MCD', name: "McDonald's Corp.", type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'DIS', name: 'Walt Disney Co.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'PYPL', name: 'PayPal Holdings', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
  { symbol: 'SHOP', name: 'Shopify Inc.', type: 'EQUITY', exchange: 'NYSE' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'ETF', exchange: 'NYSE Arca' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', exchange: 'NASDAQ' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'ETF', exchange: 'NYSE Arca' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'ETF', exchange: 'NYSE Arca' },
  { symbol: '^GSPC', name: 'S&P 500', type: 'INDEX', exchange: 'SNPINDEX' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', type: 'INDEX', exchange: 'DJI' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'INDEX', exchange: 'NASDAQ' },
  { symbol: '^VIX', name: 'CBOE Volatility Index', type: 'INDEX', exchange: 'CBOE' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD', type: 'CRYPTOCURRENCY', exchange: 'CCC' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', type: 'CRYPTOCURRENCY', exchange: 'CCC' },
  { symbol: 'SOL-USD', name: 'Solana USD', type: 'CRYPTOCURRENCY', exchange: 'CCC' },
  { symbol: 'BNB-USD', name: 'BNB USD', type: 'CRYPTOCURRENCY', exchange: 'CCC' },
  { symbol: 'GC=F', name: 'Gold Futures', type: 'FUTURE', exchange: 'COMEX' },
  { symbol: 'CL=F', name: 'Crude Oil Futures', type: 'FUTURE', exchange: 'NYMEX' },
  { symbol: 'EUR=X', name: 'EUR/USD', type: 'CURRENCY', exchange: 'CCY' },
  { symbol: 'GBP=X', name: 'GBP/USD', type: 'CURRENCY', exchange: 'CCY' },
];

export function searchSymbols(query) {
  const q = query.toLowerCase();
  return ALL_SYMBOLS
    .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .slice(0, 15);
}

const NEWS_ITEMS = [
  { title: 'Markets Rally as Fed Signals Rate Cut Ahead', publisher: 'Reuters' },
  { title: 'Tech Stocks Surge on Strong Earnings Reports', publisher: 'Bloomberg' },
  { title: 'S&P 500 Hits New Record High Amid Optimism', publisher: 'CNBC' },
  { title: 'AI Investment Boom Continues to Drive Growth', publisher: 'Financial Times' },
  { title: 'Bond Yields Fall as Inflation Data Cools', publisher: 'Wall Street Journal' },
  { title: 'Crypto Market Sees Significant Inflows This Week', publisher: 'CoinDesk' },
  { title: 'Oil Prices Stabilize After Geopolitical Tensions', publisher: 'Reuters' },
  { title: 'Gold Hits Multi-Year High on Safe Haven Demand', publisher: 'Bloomberg' },
  { title: 'Consumer Spending Remains Resilient Despite Rates', publisher: 'CNBC' },
  { title: 'Earnings Season Beats Expectations Broadly', publisher: 'MarketWatch' },
  { title: 'Central Banks Signal Coordinated Easing Approach', publisher: 'Financial Times' },
  { title: 'Semiconductor Shortage Begins to Ease', publisher: 'Reuters' },
];

export function generateNews(symbol) {
  const now = Math.floor(Date.now() / 1000);
  return NEWS_ITEMS.map((item, i) => ({
    id: `news-${i}`,
    title: symbol
      ? `${item.title} — ${symbol} Analysis`
      : item.title,
    publisher: item.publisher,
    link: '#',
    publishedAt: now - i * 3600 * (1 + Math.random() * 3),
    thumbnail: null,
    relatedSymbols: symbol ? [symbol] : [],
  }));
}

export const MARKET_SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^VIX', 'GC=F', 'CL=F', 'BTC-USD', 'ETH-USD', 'EUR=X', '^TNX'];
