import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = `ws://${window.location.hostname}:3001`;

interface PriceUpdate {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

export function useLivePrice(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', symbols: symbolsRef.current }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'prices') {
            setPrices(prev => ({ ...prev, ...msg.data }));
          }
        } catch {}
      };

      ws.onclose = () => {
        setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };

      return ws;
    } catch {
      setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    const ws = connect();
    return () => {
      ws?.close();
      wsRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', symbols }));
    }
  }, [symbols.join(',')]);

  return prices;
}
