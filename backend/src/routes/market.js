import { Router } from 'express';
import { generateCandles, generateQuote, searchSymbols, generateNews, MARKET_SYMBOLS } from '../services/generator.js';
import { yahooCandles, yahooQuote } from '../services/yahooData.js';
import { stooqCandles, stooqQuote } from '../services/stooqData.js';
import { googleQuote } from '../services/googleFinance.js';
import { investingQuote } from '../services/investing.js';
import { krakenCandles, krakenQuote } from '../services/krakenData.js';
import { cryptoCompareCandles, cryptoCompareQuote } from '../services/cryptoCompareData.js';
import { avCandles, avQuote, isConfigured as avConfigured } from '../services/alphaVantage.js';
import { finnhubCandles, finnhubQuote, isConfigured as fhConfigured } from '../services/finnhubData.js';
import { polygonCandles, polygonQuote, isConfigured as pgConfigured } from '../services/polygonData.js';
import { classifySymbol } from '../services/symbols.js';

const router = Router();

// Run providers in priority order; return first non-empty result.
async function firstOf(steps) {
  for (const step of steps) {
    try {
      const value = await step.run();
      if (value && (!Array.isArray(value) || value.length > 0)) return { value, source: step.source };
    } catch { /* next */ }
  }
  return null;
}

function candleSteps(symbol, interval) {
  const cls = classifySymbol(symbol);
  const common = [];
  if (avConfigured())  common.push({ source: 'alpha_vantage', run: () => avCandles(symbol, interval) });
  if (pgConfigured() && cls === 'stock') common.push({ source: 'polygon', run: () => polygonCandles(symbol, interval) });
  if (fhConfigured())  common.push({ source: 'finnhub', run: () => finnhubCandles(symbol, interval) });

  if (cls === 'crypto') return [
    { source: 'yahoo',          run: () => yahooCandles(symbol, interval) },
    { source: 'kraken',         run: () => krakenCandles(symbol, interval) },
    { source: 'cryptocompare',  run: () => cryptoCompareCandles(symbol, interval) },
    ...common,
    { source: 'stooq',          run: () => stooqCandles(symbol, interval) },
  ];

  return [
    { source: 'yahoo', run: () => yahooCandles(symbol, interval) },
    ...common,
    { source: 'stooq', run: () => stooqCandles(symbol, interval) },
  ];
}

function quoteSteps(symbol) {
  const cls = classifySymbol(symbol);
  const keyedProviders = [];
  if (avConfigured())  keyedProviders.push({ source: 'alpha_vantage', run: () => avQuote(symbol) });
  if (pgConfigured() && cls === 'stock') keyedProviders.push({ source: 'polygon', run: () => polygonQuote(symbol) });
  if (fhConfigured())  keyedProviders.push({ source: 'finnhub', run: () => finnhubQuote(symbol) });

  if (cls === 'crypto') return [
    { source: 'yahoo',          run: () => yahooQuote(symbol) },
    { source: 'kraken',         run: () => krakenQuote(symbol) },
    { source: 'cryptocompare',  run: () => cryptoCompareQuote(symbol) },
    ...keyedProviders,
    { source: 'google',         run: () => googleQuote(symbol) },
    { source: 'stooq',          run: () => stooqQuote(symbol) },
  ];

  return [
    { source: 'yahoo',    run: () => yahooQuote(symbol) },
    { source: 'google',   run: () => googleQuote(symbol) },
    ...keyedProviders,
    { source: 'investing',run: () => investingQuote(symbol) },
    { source: 'stooq',    run: () => stooqQuote(symbol) },
  ];
}

async function resolveCandles(symbol, interval) {
  const result = await firstOf(candleSteps(symbol, interval));
  if (result) return { candles: result.value, source: result.source };
  return { candles: generateCandles(symbol, interval), source: 'simulated' };
}

async function resolveQuote(symbol) {
  const result = await firstOf(quoteSteps(symbol));
  if (result) return { ...result.value, source: result.source };
  const sim = generateQuote(symbol);
  return sim ? { ...sim, source: 'simulated' } : null;
}

router.get('/health', (_, res) => res.json({ status: 'ok', service: 'Nexus Backend' }));

router.get('/candles', async (req, res) => {
  try {
    const { symbol, interval = '1D' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const { candles, source } = await resolveCandles(symbol.toUpperCase(), interval);
    res.json({ symbol: symbol.toUpperCase(), interval, candles, source });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const quote = await resolveQuote(symbol.toUpperCase());
    if (!quote) return res.status(404).json({ error: 'No data' });
    res.json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', (req, res) => {
  try { res.json({ results: req.query.q ? searchSymbols(req.query.q) : [] }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/news', (req, res) => {
  try { res.json({ news: generateNews(req.query.symbol || '') }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/markets', async (req, res) => {
  try {
    const settled = await Promise.allSettled(MARKET_SYMBOLS.map(sym => resolveQuote(sym)));
    const markets = settled.map((r, i) =>
      r.status === 'fulfilled' && r.value
        ? { symbol: MARKET_SYMBOLS[i], name: r.value.name, price: r.value.price, change: r.value.change, changePercent: r.value.changePercent, source: r.value.source }
        : null
    ).filter(Boolean);
    res.json({ markets });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Live probe of every data source — useful for the "Data Sources" UI panel.
router.get('/datasources', async (_, res) => {
  const probes = [
    { name: 'Yahoo Finance',   category: 'stocks · forex · crypto', run: () => yahooQuote('AAPL') },
    { name: 'Stooq',           category: 'stocks · forex · crypto (daily)', run: () => stooqQuote('AAPL') },
    { name: 'Kraken',          category: 'crypto OHLC', run: () => krakenQuote('BTC-USD') },
    { name: 'CryptoCompare',   category: 'crypto OHLC (250+ exchanges)', run: () => cryptoCompareQuote('BTC-USD') },
    { name: 'Google Finance',  category: 'stocks · forex (quote only)', run: () => googleQuote('AAPL') },
    { name: 'Investing.com',   category: 'experimental — often blocked', run: () => investingQuote('AAPL') },
    ...(avConfigured() ? [{ name: 'Alpha Vantage', category: 'stocks · forex · crypto (key set)', run: () => avQuote('AAPL') }] : []),
    ...(pgConfigured() ? [{ name: 'Polygon.io',    category: 'US stocks (key set)', run: () => polygonQuote('AAPL') }] : []),
    ...(fhConfigured() ? [{ name: 'Finnhub',       category: 'stocks · forex · crypto (key set)', run: () => finnhubQuote('AAPL') }] : []),
  ];
  const results = await Promise.all(probes.map(async (p) => {
    const t0 = Date.now();
    try {
      await p.run();
      return { name: p.name, category: p.category, status: 'up', ms: Date.now() - t0 };
    } catch (e) {
      return { name: p.name, category: p.category, status: 'down', error: e.message };
    }
  }));
  res.json({ sources: results, checkedAt: new Date().toISOString() });
});

export default router;
