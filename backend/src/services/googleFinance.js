// Google Finance has no public API — this scrapes the public quote page.
// Server-side only (CORS-blocked in browsers). Live quote only, no history.
import { classifySymbol, googleSegments } from './symbols.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

function num(str) {
  const n = parseFloat(String(str).replace(/[, ]/g, ''));
  return isFinite(n) ? n : null;
}

function parseQuote(html, symbol, currencyHint) {
  // The price lives on a div carrying data-last-price (most reliable handle).
  const priceM = html.match(/data-last-price="([\d.]+)"/);
  if (!priceM) return null;
  const price = num(priceM[1]);
  if (price == null) return null;

  const ccyM = html.match(/data-currency-code="([A-Z]{3})"/);
  const currency = ccyM?.[1] || currencyHint || 'USD';

  // "Previous close" appears in the stats table as a labelled row.
  let prevClose = null;
  const pcM = html.match(/Previous close<\/div><div[^>]*>([^<]+)</);
  if (pcM) prevClose = num(pcM[1].replace(/[^\d.]/g, ''));

  const change = prevClose != null ? price - prevClose : 0;
  return {
    symbol: String(symbol).toUpperCase(),
    name: String(symbol).toUpperCase(),
    price,
    open: prevClose ?? price,
    high: price,
    low: price,
    prevClose: prevClose ?? price,
    volume: 0,
    change: parseFloat(change.toFixed(4)),
    changePercent: prevClose ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0,
    exchange: 'Google Finance',
    currency,
  };
}

export async function googleQuote(symbol) {
  const cls = classifySymbol(symbol);
  const segments = googleSegments(symbol, cls);
  for (const seg of segments) {
    try {
      const res = await fetch(`https://www.google.com/finance/quote/${seg}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const quote = parseQuote(await res.text(), symbol, cls === 'forex' ? seg.split('-')[1] : 'USD');
      if (quote) return quote;
    } catch {
      /* try next exchange candidate */
    }
  }
  throw new Error('Google Finance: no quote');
}
