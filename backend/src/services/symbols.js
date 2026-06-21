// Server-side symbol classification + cross-provider mapping (mirrors the
// frontend assetClass.ts). Used by the Stooq / Google Finance / Investing modules.

const COMMON_CRYPTO = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'LTC', 'TRX', 'SHIB', 'UNI', 'ATOM', 'XLM', 'BCH', 'NEAR', 'APT',
]);

const FIAT = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD',
  'SGD', 'SEK', 'NOK', 'DKK', 'PLN', 'MXN', 'ZAR', 'TRY', 'INR', 'BRL',
]);

export function classifySymbol(symbol) {
  const s = String(symbol).toUpperCase().trim();
  if (s.startsWith('^')) return 'index';
  if (s.endsWith('=F')) return 'future';
  if (s.endsWith('=X')) return 'forex';
  if (/-USD[T]?$/.test(s)) return 'crypto';
  if (COMMON_CRYPTO.has(s.replace(/-USD[T]?$/, ''))) return 'crypto';
  if (/^[A-Z]{6}$/.test(s) && FIAT.has(s.slice(0, 3)) && FIAT.has(s.slice(3, 6))) return 'forex';
  return 'stock';
}

export function cryptoBase(symbol) {
  return String(symbol).toUpperCase().replace(/-USD[T]?$/, '').trim();
}

const FOREX_OVERRIDES = {
  'EUR=X': { base: 'EUR', quote: 'USD' },
  'GBP=X': { base: 'GBP', quote: 'USD' },
  'AUD=X': { base: 'AUD', quote: 'USD' },
  'NZD=X': { base: 'NZD', quote: 'USD' },
  'JPY=X': { base: 'USD', quote: 'JPY' },
  'CHF=X': { base: 'USD', quote: 'CHF' },
  'CAD=X': { base: 'USD', quote: 'CAD' },
  'CNY=X': { base: 'USD', quote: 'CNY' },
};

export function parseForexPair(symbol) {
  const s = String(symbol).toUpperCase().trim();
  if (FOREX_OVERRIDES[s]) return FOREX_OVERRIDES[s];
  const m = s.replace('=X', '');
  if (/^[A-Z]{6}$/.test(m) && FIAT.has(m.slice(0, 3)) && FIAT.has(m.slice(3, 6))) {
    return { base: m.slice(0, 3), quote: m.slice(3, 6) };
  }
  if (/^[A-Z]{3}=X$/.test(s)) return { base: s.slice(0, 3), quote: 'USD' };
  return null;
}

export function toStooqSymbol(symbol, cls = classifySymbol(symbol)) {
  const s = String(symbol).toUpperCase().trim();
  if (cls === 'crypto') return `${cryptoBase(s)}USD`.toLowerCase();
  if (cls === 'forex') {
    const p = parseForexPair(s);
    return (p ? `${p.base}${p.quote}` : s.replace('=X', '')).toLowerCase();
  }
  if (cls === 'index') {
    const map = { '^GSPC': '^spx', '^DJI': '^dji', '^IXIC': '^ndq', '^RUT': '^rut' };
    return map[s] || s.toLowerCase();
  }
  if (cls === 'future') return s.replace('=F', '.f').toLowerCase();
  return `${s}.us`.toLowerCase();
}

// Candidate Google Finance URL path segments to try (TICKER:EXCHANGE form).
export function googleSegments(symbol, cls = classifySymbol(symbol)) {
  const s = String(symbol).toUpperCase().trim();
  if (cls === 'crypto') return [`${cryptoBase(s)}-USD`];
  if (cls === 'forex') {
    const p = parseForexPair(s);
    return p ? [`${p.base}-${p.quote}`] : [];
  }
  if (cls === 'index') {
    const map = {
      '^GSPC': '.INX:INDEXSP', '^DJI': '.DJI:INDEXDJX',
      '^IXIC': '.IXIC:INDEXNASDAQ', '^RUT': 'RUT:INDEXRUSSELL',
    };
    return map[s] ? [map[s]] : [];
  }
  if (cls === 'future') return [];
  return [`${s}:NASDAQ`, `${s}:NYSE`, `${s}:NYSEARCA`, `${s}:OTCMKTS`];
}
