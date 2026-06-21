import { Router } from 'express';
import { generateCandles, generateQuote, searchSymbols, generateNews, MARKET_SYMBOLS } from '../services/generator.js';
import { yahooCandles, yahooQuote } from '../services/yahooData.js';
import { stooqCandles, stooqQuote } from '../services/stooqData.js';
import { googleQuote } from '../services/googleFinance.js';
import { investingQuote } from '../services/investing.js';

const router = Router();

// Run providers in order, return the first that resolves a non-empty result.
async function firstOf(steps) {
  for (const step of steps) {
    try {
      const value = await step.run();
      if (value && (!Array.isArray(value) || value.length > 0)) {
        return { value, source: step.source };
      }
    } catch {
      /* next provider */
    }
  }
  return null;
}

async function resolveCandles(symbol, interval) {
  const result = await firstOf([
    { source: 'yahoo', run: () => yahooCandles(symbol, interval) },
    { source: 'stooq', run: () => stooqCandles(symbol, interval) },
  ]);
  if (result) return { candles: result.value, source: result.source };
  return { candles: generateCandles(symbol, interval), source: 'simulated' };
}

async function resolveQuote(symbol) {
  const result = await firstOf([
    { source: 'yahoo', run: () => yahooQuote(symbol) },
    { source: 'google', run: () => googleQuote(symbol) },
    { source: 'investing', run: () => investingQuote(symbol) },
    { source: 'stooq', run: () => stooqQuote(symbol) },
  ]);
  if (result) return { ...result.value, source: result.source };
  const sim = generateQuote(symbol);
  return sim ? { ...sim, source: 'simulated' } : null;
}

router.get('/health', (_, res) => res.json({ status: 'ok', service: 'Nexus Backend' }));

router.get('/candles', async (req, res) => {
  try {
    const { symbol, interval = '1D' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const sym = symbol.toUpperCase();
    const { candles, source } = await resolveCandles(sym, interval);
    res.json({ symbol: sym, interval, candles, source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const quote = await resolveQuote(symbol.toUpperCase());
    if (!quote) return res.status(404).json({ error: 'No data' });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    res.json({ results: q ? searchSymbols(q) : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/news', (req, res) => {
  try {
    res.json({ news: generateNews(req.query.symbol || '') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/markets', async (req, res) => {
  try {
    const settled = await Promise.allSettled(MARKET_SYMBOLS.map((sym) => resolveQuote(sym)));
    const markets = settled
      .map((r, i) =>
        r.status === 'fulfilled' && r.value
          ? {
              symbol: MARKET_SYMBOLS[i],
              name: r.value.name,
              price: r.value.price,
              change: r.value.change,
              changePercent: r.value.changePercent,
              source: r.value.source,
            }
          : null
      )
      .filter(Boolean);
    res.json({ markets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Probe every external provider so the UI can report which sources are live.
router.get('/datasources', async (_, res) => {
  const probes = [
    { name: 'Yahoo Finance', assets: 'stocks · forex · crypto', run: () => yahooQuote('AAPL') },
    { name: 'Stooq', assets: 'stocks · forex · crypto (daily)', run: () => stooqQuote('AAPL') },
    { name: 'Google Finance', assets: 'stocks · forex · crypto (quote)', run: () => googleQuote('AAPL') },
    { name: 'Investing.com', assets: 'experimental — often blocked', run: () => investingQuote('AAPL') },
  ];
  const results = await Promise.all(
    probes.map(async (p) => {
      const t0 = Date.now();
      try {
        await p.run();
        return { name: p.name, assets: p.assets, status: 'up', ms: Date.now() - t0 };
      } catch (e) {
        return { name: p.name, assets: p.assets, status: 'down', error: e.message };
      }
    })
  );
  res.json({ sources: results, checkedAt: new Date().toISOString() });
});

export default router;
