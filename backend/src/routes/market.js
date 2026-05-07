import { Router } from 'express';
import { generateCandles, generateQuote, searchSymbols, generateNews, MARKET_SYMBOLS } from '../services/generator.js';

const router = Router();

router.get('/candles', (req, res) => {
  try {
    const { symbol, interval = '1D' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const candles = generateCandles(symbol.toUpperCase(), interval);
    res.json({ symbol: symbol.toUpperCase(), interval, candles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quote', (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const quote = generateQuote(symbol.toUpperCase());
    if (!quote) return res.status(404).json({ error: 'No data' });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    const results = q ? searchSymbols(q) : [];
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/news', (req, res) => {
  try {
    const { symbol } = req.query;
    const news = generateNews(symbol || '');
    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/markets', (req, res) => {
  try {
    const markets = MARKET_SYMBOLS.map(sym => {
      const q = generateQuote(sym);
      return q ? { symbol: sym, name: q.name, price: q.price, change: q.change, changePercent: q.changePercent } : null;
    }).filter(Boolean);
    res.json({ markets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
