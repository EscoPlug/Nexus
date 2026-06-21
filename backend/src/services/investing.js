// Investing.com has no public API and is protected by Cloudflare anti-bot.
// This is a BEST-EFFORT server-side attempt against their search endpoint and
// will often be blocked (returns 403/503). It degrades gracefully to an error
// so the aggregator falls through to other providers. Treat as experimental.
import { cryptoBase, classifySymbol, parseForexPair } from './symbols.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

function searchTerm(symbol) {
  const cls = classifySymbol(symbol);
  if (cls === 'crypto') return `${cryptoBase(symbol)} USD`;
  if (cls === 'forex') {
    const p = parseForexPair(symbol);
    return p ? `${p.base}/${p.quote}` : symbol;
  }
  return String(symbol).toUpperCase();
}

export async function investingQuote(symbol) {
  const q = encodeURIComponent(searchTerm(symbol));
  const res = await fetch(`https://api.investing.com/api/search/v2/search?q=${q}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Investing HTTP ${res.status}`);
  const data = await res.json();
  const hit = (data.quotes || data.items || [])[0];
  if (!hit) throw new Error('Investing: no match');

  const price = parseFloat(String(hit.last ?? hit.price ?? '').replace(/,/g, ''));
  if (!isFinite(price)) throw new Error('Investing: no price');
  const changePercent = parseFloat(String(hit.changePercent ?? hit.pc ?? '0').replace(/[%,]/g, '')) || 0;
  const change = parseFloat(String(hit.change ?? '0').replace(/,/g, '')) || 0;

  return {
    symbol: String(symbol).toUpperCase(),
    name: hit.name || hit.description || String(symbol).toUpperCase(),
    price,
    open: price - change,
    high: price,
    low: price,
    prevClose: price - change,
    volume: 0,
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(changePercent.toFixed(4)),
    exchange: 'Investing.com',
    currency: 'USD',
  };
}
