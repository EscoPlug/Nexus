// Classifies a ticker symbol into an asset class and maps it across providers.
// The app uses Yahoo-style symbols internally (e.g. BTC-USD, EUR=X, GC=F, ^GSPC).

export type AssetClass = 'crypto' | 'forex' | 'future' | 'index' | 'stock';

const COMMON_CRYPTO = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'LTC', 'TRX', 'SHIB', 'UNI', 'ATOM', 'XLM', 'BCH', 'NEAR', 'APT',
  'ARB', 'OP', 'FIL', 'ICP', 'ETC', 'HBAR', 'VET', 'INJ', 'SUI', 'SEI',
]);

export function classifySymbol(symbol: string): AssetClass {
  const s = symbol.toUpperCase().trim();
  if (s.startsWith('^')) return 'index';
  if (s.endsWith('=F')) return 'future';
  if (s.endsWith('=X')) return 'forex';
  // Yahoo crypto form: BTC-USD, ETH-USD, …
  if (/-USD[T]?$/.test(s)) return 'crypto';
  // Bare crypto ticker
  const bare = s.replace(/-USD[T]?$/, '');
  if (COMMON_CRYPTO.has(bare)) return 'crypto';
  // 6-letter forex pair like EURUSD
  if (/^[A-Z]{6}$/.test(s) && isForexPair(s)) return 'forex';
  return 'stock';
}

const FIAT = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD',
  'SGD', 'SEK', 'NOK', 'DKK', 'PLN', 'MXN', 'ZAR', 'TRY', 'INR', 'BRL',
]);

function isForexPair(s: string): boolean {
  return FIAT.has(s.slice(0, 3)) && FIAT.has(s.slice(3, 6));
}

// ── Crypto mapping ──────────────────────────────────────────────────────────

export function cryptoBase(symbol: string): string {
  return symbol.toUpperCase().replace(/-USD[T]?$/, '').trim();
}

// Yahoo BTC-USD → Binance BTCUSDT (Binance quotes most USD pairs in USDT)
export function toBinanceSymbol(symbol: string): string {
  return `${cryptoBase(symbol)}USDT`;
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
  DOT: 'polkadot', MATIC: 'matic-network', LINK: 'chainlink', LTC: 'litecoin',
  TRX: 'tron', SHIB: 'shiba-inu', UNI: 'uniswap', ATOM: 'cosmos',
  XLM: 'stellar', BCH: 'bitcoin-cash', NEAR: 'near', APT: 'aptos',
  ARB: 'arbitrum', OP: 'optimism', FIL: 'filecoin', ICP: 'internet-computer',
  ETC: 'ethereum-classic', HBAR: 'hedera-hashgraph', VET: 'vechain',
  INJ: 'injective-protocol', SUI: 'sui', SEI: 'sei-network',
};

export function toCoingeckoId(symbol: string): string | null {
  return COINGECKO_IDS[cryptoBase(symbol)] ?? null;
}

// ── Forex mapping ───────────────────────────────────────────────────────────
// Yahoo's shorthand is quirky: EUR=X → EUR/USD, but JPY=X → USD/JPY.
// Returns { base, quote } so we can query explicit-pair providers.

const FOREX_OVERRIDES: Record<string, { base: string; quote: string }> = {
  'EUR=X': { base: 'EUR', quote: 'USD' },
  'GBP=X': { base: 'GBP', quote: 'USD' },
  'AUD=X': { base: 'AUD', quote: 'USD' },
  'NZD=X': { base: 'NZD', quote: 'USD' },
  'JPY=X': { base: 'USD', quote: 'JPY' },
  'CHF=X': { base: 'USD', quote: 'CHF' },
  'CAD=X': { base: 'USD', quote: 'CAD' },
  'CNY=X': { base: 'USD', quote: 'CNY' },
};

export function parseForexPair(symbol: string): { base: string; quote: string } | null {
  const s = symbol.toUpperCase().trim();
  if (FOREX_OVERRIDES[s]) return FOREX_OVERRIDES[s];
  // EURUSD=X or EURUSD
  const m = s.replace('=X', '');
  if (/^[A-Z]{6}$/.test(m) && FIAT.has(m.slice(0, 3)) && FIAT.has(m.slice(3, 6))) {
    return { base: m.slice(0, 3), quote: m.slice(3, 6) };
  }
  // XXX=X with no override → assume XXX/USD
  if (/^[A-Z]{3}=X$/.test(s)) {
    return { base: s.slice(0, 3), quote: 'USD' };
  }
  return null;
}

// Stooq symbol form: stocks aapl.us, forex eurusd, crypto btcusd, indices ^spx
export function toStooqSymbol(symbol: string, cls: AssetClass): string {
  const s = symbol.toUpperCase().trim();
  if (cls === 'crypto') return `${cryptoBase(s)}USD`.toLowerCase();
  if (cls === 'forex') {
    const p = parseForexPair(s);
    return p ? `${p.base}${p.quote}`.toLowerCase() : s.replace('=X', '').toLowerCase();
  }
  if (cls === 'index') {
    const map: Record<string, string> = { '^GSPC': '^spx', '^DJI': '^dji', '^IXIC': '^ndq', '^RUT': '^rut' };
    return map[s] ?? s.toLowerCase();
  }
  if (cls === 'future') return s.replace('=F', '.f').toLowerCase();
  // US equities
  return `${s}.us`.toLowerCase();
}
