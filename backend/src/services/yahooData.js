// Server-side Yahoo Finance client (no CORS limits). Stocks, forex, crypto, indices.
const YF = 'https://query1.finance.yahoo.com';
const YF2 = 'https://query2.finance.yahoo.com';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  Accept: 'application/json',
};

const INTERVAL_MAP = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '60m', '4h': '1h', '1D': '1d', '1W': '1wk', '1M': '1mo',
};
const RANGE_MAP = {
  '1m': '1d', '5m': '1d', '15m': '1d', '30m': '1d',
  '1h': '5d', '4h': '1mo', '1D': '5d', '1W': '6mo', '1M': '2y',
};

async function chart(symbol, interval, range) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  for (const base of [YF, YF2]) {
    try {
      const res = await fetch(`${base}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(7000) });
      if (res.ok) return res.json();
    } catch {
      /* try next host */
    }
  }
  throw new Error('Yahoo unreachable');
}

export async function yahooCandles(symbol, interval) {
  const itv = INTERVAL_MAP[interval] || '1d';
  const range = RANGE_MAP[interval] || '1y';
  const data = await chart(symbol, itv, range);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo: no data');
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    bars.push({
      time: ts[i],
      open: parseFloat(o.toFixed(4)),
      high: parseFloat(h.toFixed(4)),
      low: parseFloat(l.toFixed(4)),
      close: parseFloat(c.toFixed(4)),
      volume: Math.round(q.volume?.[i] || 0),
    });
  }
  if (bars.length === 0) throw new Error('Yahoo: empty');
  return bars;
}

export async function yahooQuote(symbol) {
  const data = await chart(symbol, '1d', '5d');
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo: no quote');
  const meta = result.meta || {};
  const q = result.indicators?.quote?.[0] || {};
  const last = (result.timestamp?.length || 1) - 1;
  const price = meta.regularMarketPrice ?? q.close?.[last];
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? q.close?.[last - 1];
  const change = price && prevClose ? price - prevClose : 0;
  return {
    symbol: String(symbol).toUpperCase(),
    name: meta.longName || meta.shortName || symbol,
    price,
    open: meta.regularMarketDayOpen ?? q.open?.[last],
    high: meta.regularMarketDayHigh ?? q.high?.[last],
    low: meta.regularMarketDayLow ?? q.low?.[last],
    prevClose,
    volume: meta.regularMarketVolume ?? q.volume?.[last] ?? 0,
    change: parseFloat(change.toFixed(4)),
    changePercent: prevClose ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0,
    exchange: meta.fullExchangeName || meta.exchangeName || '',
    currency: meta.currency || 'USD',
  };
}
