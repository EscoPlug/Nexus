import { Router } from 'express';
import yahooFinance from 'yahoo-finance2';

const router = Router();

const INTERVAL_MAP = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '60m', '4h': '1h', '1D': '1d', '1W': '1wk', '1M': '1mo'
};

const RANGE_MAP = {
  '1m': '1d', '5m': '5d', '15m': '1mo', '30m': '1mo',
  '1h': '3mo', '4h': '6mo', '1D': '2y', '1W': '5y', '1M': 'max'
};

router.get('/candles', async (req, res) => {
  try {
    const { symbol, interval = '1D', range } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    const yfInterval = INTERVAL_MAP[interval] || '1d';
    const yfRange = range || RANGE_MAP[interval] || '1y';

    const result = await yahooFinance.chart(symbol.toUpperCase(), {
      interval: yfInterval,
      range: yfRange,
    });

    const candles = (result.quotes || [])
      .filter(q => q.open != null && q.high != null && q.low != null && q.close != null)
      .map(q => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: parseFloat(q.open.toFixed(4)),
        high: parseFloat(q.high.toFixed(4)),
        low: parseFloat(q.low.toFixed(4)),
        close: parseFloat(q.close.toFixed(4)),
        volume: q.volume || 0,
      }));

    res.json({ symbol: symbol.toUpperCase(), interval, candles });
  } catch (err) {
    console.error('candles error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/quote', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    const q = await yahooFinance.quote(symbol.toUpperCase());
    res.json({
      symbol: q.symbol,
      name: q.longName || q.shortName || symbol,
      price: q.regularMarketPrice,
      open: q.regularMarketOpen,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      prevClose: q.regularMarketPreviousClose,
      volume: q.regularMarketVolume,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      marketCap: q.marketCap,
      pe: q.trailingPE,
      eps: q.epsTrailingTwelveMonths,
      week52High: q.fiftyTwoWeekHigh,
      week52Low: q.fiftyTwoWeekLow,
      avgVolume: q.averageDailyVolume3Month,
      exchange: q.fullExchangeName || q.exchange,
      currency: q.currency || 'USD',
      sector: q.sector || '',
      industry: q.industry || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ results: [] });

    const result = await yahooFinance.search(q, { quotesCount: 15, newsCount: 0 });
    const results = (result.quotes || [])
      .filter(r => r.symbol && !['OPTION', 'FUTURE'].includes(r.quoteType))
      .map(r => ({
        symbol: r.symbol,
        name: r.longname || r.shortname || r.symbol,
        type: r.quoteType || 'EQUITY',
        exchange: r.exchDisp || r.exchange || '',
      }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/news', async (req, res) => {
  try {
    const { symbol } = req.query;
    const result = await yahooFinance.search(symbol || 'markets', {
      quotesCount: 0,
      newsCount: 12,
    });

    const news = (result.news || []).map(n => ({
      id: n.uuid || String(Math.random()),
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      publishedAt: n.providerPublishTime,
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
      relatedSymbols: n.relatedTickers || [],
    }));

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/markets', async (req, res) => {
  try {
    const symbols = ['^GSPC', '^DJI', '^IXIC', '^VIX', 'GC=F', 'CL=F', 'BTC-USD', 'ETH-USD', 'EUR=X', '^TNX'];
    const quotes = await Promise.allSettled(symbols.map(s => yahooFinance.quote(s)));

    const markets = quotes
      .map((r, i) => r.status === 'fulfilled' && r.value ? {
        symbol: symbols[i],
        name: r.value.shortName || symbols[i],
        price: r.value.regularMarketPrice,
        change: r.value.regularMarketChange,
        changePercent: r.value.regularMarketChangePercent,
      } : null)
      .filter(Boolean);

    res.json({ markets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
