import { useState, useEffect, useRef } from 'react';
import { fetchQuote, getDataSource } from '../api';
import { simQuote } from '../api/simulation';

interface PriceUpdate {
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high?: number;
  low?: number;
}

export function useLivePrice(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  // Try WebSocket first (works on local dev with backend)
  useEffect(() => {
    getDataSource().then(source => {
      if (source === 'backend') {
        try {
          const wsUrl = `ws://${window.location.hostname}:3001`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'subscribe', symbols: symbolsRef.current }));
          };
          ws.onmessage = (e) => {
            try {
              const msg = JSON.parse(e.data);
              if (msg.type === 'prices') setPrices(prev => ({ ...prev, ...msg.data }));
            } catch {}
          };
          ws.onerror = () => ws.close();
        } catch {}
      }
    });
    return () => { wsRef.current?.close(); };
  }, []);

  // Subscribe to new symbols when watchlist changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', symbols }));
    }
  }, [symbols.join(',')]);

  // Poll client-side API for price updates every 10s
  useEffect(() => {
    if (symbols.length === 0) return;

    const poll = async () => {
      const updates: Record<string, PriceUpdate> = {};
      await Promise.allSettled(
        symbols.map(async sym => {
          try {
            const source = await getDataSource();
            if (source === 'backend') return; // handled by WebSocket
            const q = source === 'simulated' ? simQuote(sym) : await fetchQuote(sym);
            if (q) {
              // Add tiny jitter for visual "live" movement
              const jitter = source === 'simulated' ? (Math.random() - 0.5) * 0.003 : 0;
              updates[sym] = {
                price: q.price * (1 + jitter),
                change: q.change,
                changePercent: q.changePercent,
              };
            }
          } catch {}
        })
      );
      if (Object.keys(updates).length > 0) {
        setPrices(prev => ({ ...prev, ...updates }));
      }
    };

    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [symbols.join(',')]);

  return prices;
}
