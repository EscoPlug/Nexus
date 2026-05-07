import React, { useEffect, useRef, useState } from 'react';

interface Props {
  symbol: string;
  currentPrice: number;
}

interface Level2Row {
  mm: string;
  price: number;
  size: number;
}

const MMS = ['ARCA', 'EDGX', 'BATS', 'MEMX', 'CINN', 'BATY', 'NASDAQ', 'NYSE', 'DRCTEDGE'];

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLevels(rng: () => number, basePrice: number, count: number, isBid: boolean): Level2Row[] {
  const levels: Level2Row[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const step = 0.01 + rng() * 0.04;
    price = isBid ? price - step : price + step;
    const size = Math.floor(100 + rng() * 4900);
    const mm = MMS[(i * 3 + (isBid ? 0 : 1)) % MMS.length];
    levels.push({ mm, price: Math.round(price * 100) / 100, size });
  }
  return levels;
}

export const Level2Panel: React.FC<Props> = ({ symbol, currentPrice }) => {
  const [bids, setBids] = useState<Level2Row[]>([]);
  const [asks, setAsks] = useState<Level2Row[]>([]);

  // Re-seed when symbol or price changes
  useEffect(() => {
    const baseSeed =
      symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) +
      Math.floor(currentPrice) * 7;

    const rngSpread = mulberry32(baseSeed);
    const spread = 0.01 + rngSpread() * 0.04;
    const bestBid = Math.round((currentPrice - spread / 2) * 100) / 100;
    const bestAsk = Math.round((currentPrice + spread / 2) * 100) / 100;

    setBids(buildLevels(mulberry32(baseSeed + 1), bestBid, 8, true));
    setAsks(buildLevels(mulberry32(baseSeed + 2), bestAsk, 8, false));
  }, [symbol, currentPrice]);

  // Periodic jitter: sizes shift ±10-20%, occasionally a row price shifts by ±0.01
  useEffect(() => {
    const interval = setInterval(() => {
      const jitter = (row: Level2Row, idx: number): Level2Row => {
        const drift = (Math.random() - 0.5) * 0.4; // ±20% max
        const newSize = Math.max(100, Math.min(9999, Math.round(row.size * (1 + drift * 0.15))));
        const changeMM = Math.random() < 0.08;
        const priceShift = Math.random() < 0.12 ? (Math.round((Math.random() * 0.02 - 0.01) * 100) / 100) : 0;
        return {
          mm: changeMM ? MMS[Math.floor(Math.random() * MMS.length)] : row.mm,
          price: Math.round((row.price + priceShift) * 100) / 100,
          size: newSize,
        };
      };

      setBids((prev) => prev.map((row, i) => jitter(row, i)));
      setAsks((prev) => prev.map((row, i) => jitter(row, i)));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const bestBid = bids[0]?.price ?? currentPrice;
  const bestAsk = asks[0]?.price ?? currentPrice;
  const spread = Math.max(0, Math.round((bestAsk - bestBid) * 100) / 100);

  const maxBidSize = Math.max(...bids.map((b) => b.size), 1);
  const maxAskSize = Math.max(...asks.map((a) => a.size), 1);

  return (
    <div
      className="flex flex-col h-full font-mono text-xs select-none"
      style={{ backgroundColor: '#0d1117', color: '#c9d1d9' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: '#21262d', backgroundColor: '#161b22' }}
      >
        <span className="font-semibold tracking-wide" style={{ color: '#c9d1d9' }}>
          Level 2 — {symbol}
        </span>
        <div className="flex items-center gap-3" style={{ color: '#8b949e' }}>
          <span>
            Bid{' '}
            <span style={{ color: '#3fb950' }}>{bestBid.toFixed(2)}</span>
          </span>
          <span>
            Sprd{' '}
            <span>{spread.toFixed(2)}</span>
          </span>
          <span>
            Ask{' '}
            <span style={{ color: '#f85149' }}>{bestAsk.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid grid-cols-2 border-b flex-shrink-0"
        style={{ borderColor: '#21262d', backgroundColor: '#161b22' }}
      >
        <div
          className="grid grid-cols-3 px-2 py-1 border-r"
          style={{ borderColor: '#21262d' }}
        >
          <span className="font-bold" style={{ color: '#3fb950' }}>BIDS</span>
          <span className="text-right" style={{ color: '#8b949e' }}>Price</span>
          <span className="text-right" style={{ color: '#8b949e' }}>Size</span>
        </div>
        <div className="grid grid-cols-3 px-2 py-1">
          <span className="font-bold" style={{ color: '#f85149' }}>ASKS</span>
          <span className="text-right" style={{ color: '#8b949e' }}>Price</span>
          <span className="text-right" style={{ color: '#8b949e' }}>Size</span>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => {
          const bid = bids[i];
          const ask = asks[i];
          return (
            <div
              key={i}
              className="grid grid-cols-2 border-b"
              style={{ borderColor: '#21262d' }}
            >
              {/* Bid side */}
              <div
                className="relative grid grid-cols-3 px-2 py-[3px] border-r cursor-default overflow-hidden group"
                style={{ borderColor: '#21262d' }}
              >
                {/* Hover tint */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ backgroundColor: 'rgba(63,185,80,0.07)' }}
                />
                {bid && (
                  <>
                    {/* Volume bar — anchored to right */}
                    <div
                      className="absolute inset-y-0 right-0 pointer-events-none"
                      style={{
                        width: `${(bid.size / maxBidSize) * 100}%`,
                        backgroundColor: 'rgba(63,185,80,0.18)',
                      }}
                    />
                    <span className="relative z-10 truncate" style={{ color: '#8b949e' }}>
                      {bid.mm}
                    </span>
                    <span className="relative z-10 text-right" style={{ color: '#3fb950' }}>
                      {bid.price.toFixed(2)}
                    </span>
                    <span className="relative z-10 text-right" style={{ color: '#c9d1d9' }}>
                      {bid.size.toLocaleString()}
                    </span>
                  </>
                )}
              </div>

              {/* Ask side */}
              <div
                className="relative grid grid-cols-3 px-2 py-[3px] cursor-default overflow-hidden group"
              >
                {/* Hover tint */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ backgroundColor: 'rgba(248,81,73,0.07)' }}
                />
                {ask && (
                  <>
                    {/* Volume bar — anchored to left */}
                    <div
                      className="absolute inset-y-0 left-0 pointer-events-none"
                      style={{
                        width: `${(ask.size / maxAskSize) * 100}%`,
                        backgroundColor: 'rgba(248,81,73,0.18)',
                      }}
                    />
                    <span className="relative z-10 truncate" style={{ color: '#8b949e' }}>
                      {ask.mm}
                    </span>
                    <span className="relative z-10 text-right" style={{ color: '#f85149' }}>
                      {ask.price.toFixed(2)}
                    </span>
                    <span className="relative z-10 text-right" style={{ color: '#c9d1d9' }}>
                      {ask.size.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Level2Panel;
