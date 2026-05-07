import { useState, useEffect, useCallback } from 'react';
import type { OHLCVBar, Quote, Timeframe } from '../types';

const API = '/api';

export function useChartData(symbol: string, timeframe: Timeframe) {
  const [bars, setBars] = useState<OHLCVBar[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const [candlesRes, quoteRes] = await Promise.all([
        fetch(`${API}/candles?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}`),
        fetch(`${API}/quote?symbol=${encodeURIComponent(symbol)}`),
      ]);

      if (candlesRes.ok) {
        const data = await candlesRes.json();
        setBars(data.candles || []);
      }
      if (quoteRes.ok) {
        const data = await quoteRes.json();
        setQuote(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { bars, quote, loading, error, refetch: fetchData };
}

export function useSearch(query: string) {
  const [results, setResults] = useState<{ symbol: string; name: string; type: string; exchange: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return { results, loading };
}

export function useNews(symbol?: string) {
  const [news, setNews] = useState<{
    id: string;
    title: string;
    publisher: string;
    link: string;
    publishedAt: number;
    thumbnail: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = symbol ? `${API}/news?symbol=${encodeURIComponent(symbol)}` : `${API}/news`;
    fetch(url)
      .then(r => r.json())
      .then(d => setNews(d.news || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  return { news, loading };
}

export function useMarkets() {
  const [markets, setMarkets] = useState<{
    symbol: string; name: string; price: number; change: number; changePercent: number;
  }[]>([]);

  useEffect(() => {
    const fetch_ = () =>
      fetch(`${API}/markets`)
        .then(r => r.json())
        .then(d => setMarkets(d.markets || []))
        .catch(() => {});

    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => clearInterval(id);
  }, []);

  return markets;
}
