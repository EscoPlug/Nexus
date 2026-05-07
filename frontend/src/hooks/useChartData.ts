import { useState, useEffect, useCallback, useRef } from 'react';
import type { OHLCVBar, Timeframe } from '../types';
import { fetchCandles, fetchQuote, fetchSearch, fetchNews, fetchMarkets, type DataSource } from '../api';

export function useChartData(symbol: string, timeframe: Timeframe) {
  const [bars, setBars] = useState<OHLCVBar[]>([]);
  const [quote, setQuote] = useState<{
    symbol: string; name: string; price: number; open: number; high: number;
    low: number; prevClose: number; volume: number; change: number; changePercent: number;
    marketCap?: number; exchange: string; currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('simulated');

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const [{ bars: newBars, source }, newQuote] = await Promise.all([
        fetchCandles(symbol, timeframe),
        fetchQuote(symbol),
      ]);
      setBars(newBars);
      if (newQuote) setQuote(newQuote as typeof quote);
      setDataSource(source);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { bars, quote, loading, error, dataSource, refetch: fetchData };
}

export function useSearch(query: string) {
  const [results, setResults] = useState<{ symbol: string; name: string; type: string; exchange: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetchSearch(query);
        setResults(r);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  return { results, loading };
}

export function useNews(symbol?: string) {
  const [news, setNews] = useState<{
    id: string; title: string; publisher: string; link: string;
    publishedAt: number; thumbnail: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchNews(symbol)
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { news, loading };
}

export function useMarkets() {
  const [markets, setMarkets] = useState<{
    symbol: string; name: string; price: number; change: number; changePercent: number;
  }[]>([]);

  useEffect(() => {
    const load = () => fetchMarkets().then(setMarkets).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return markets;
}
