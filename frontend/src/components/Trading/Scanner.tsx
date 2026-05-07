import React, { useCallback, useMemo, useState } from 'react';

interface Props {
  onSelectSymbol: (symbol: string, name: string) => void;
}

type Tab = 'Gainers' | 'Losers' | 'Volume' | 'Momentum' | 'Gappers';

interface SymbolMeta {
  symbol: string;
  name: string;
}

const SYMBOLS: SymbolMeta[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.' },
  { symbol: 'TSLA',  name: 'Tesla Inc.' },
  { symbol: 'META',  name: 'Meta Platforms' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices' },
  { symbol: 'NFLX',  name: 'Netflix Inc.' },
  { symbol: 'GME',   name: 'GameStop Corp.' },
  { symbol: 'AMC',   name: 'AMC Entertainment' },
  { symbol: 'BBBY',  name: 'Bed Bath & Beyond' },
  { symbol: 'MULN',  name: 'Mullen Automotive' },
  { symbol: 'FFIE',  name: 'Faraday Future' },
  { symbol: 'SOFI',  name: 'SoFi Technologies' },
  { symbol: 'LCID',  name: 'Lucid Group' },
  { symbol: 'RIVN',  name: 'Rivian Automotive' },
  { symbol: 'PLTR',  name: 'Palantir Technologies' },
  { symbol: 'COIN',  name: 'Coinbase Global' },
  { symbol: 'HOOD',  name: 'Robinhood Markets' },
  { symbol: 'MARA',  name: 'Marathon Digital' },
  { symbol: 'RIOT',  name: 'Riot Platforms' },
  { symbol: 'SNDL',  name: 'Sundial Growers' },
  { symbol: 'CLOV',  name: 'Clover Health' },
  { symbol: 'WISH',  name: 'ContextLogic Inc.' },
  { symbol: 'BB',    name: 'BlackBerry Ltd.' },
  { symbol: 'NOK',   name: 'Nokia Corp.' },
  { symbol: 'SPCE',  name: 'Virgin Galactic' },
  { symbol: 'BYND',  name: 'Beyond Meat' },
  { symbol: 'WKHS',  name: 'Workhorse Group' },
  { symbol: 'NKLA',  name: 'Nikola Corp.' },
  { symbol: 'SENS',  name: 'Senseonics Holdings' },
  { symbol: 'IONQ',  name: 'IonQ Inc.' },
  { symbol: 'RKLB',  name: 'Rocket Lab USA' },
  { symbol: 'OPEN',  name: 'Opendoor Technologies' },
  { symbol: 'CTRM',  name: 'Castor Maritime' },
  { symbol: 'TLRY',  name: 'Tilray Brands' },
  { symbol: 'ATOS',  name: 'Atossa Therapeutics' },
  { symbol: 'IDEX',  name: 'Ideanomics Inc.' },
  { symbol: 'NAKD',  name: 'Naked Brand Group' },
  { symbol: 'EXPR',  name: 'Express Inc.' },
  { symbol: 'KOSS',  name: 'Koss Corp.' },
];

const TABS: Tab[] = ['Gainers', 'Losers', 'Volume', 'Momentum', 'Gappers'];

// Simple deterministic string hash → positive integer
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned
}

// mulberry32 PRNG — returns values in [0, 1)
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

interface ScanRow {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  relVolume: number;
  floatM: number;
  gapPercent: number;
}

function generateRows(dailySeed: number): ScanRow[] {
  return SYMBOLS.map(({ symbol, name }) => {
    const seed = strHash(symbol) ^ (dailySeed >>> 0);
    const rng = mulberry32(seed);

    // Price $1–$500
    const price = Math.round((1 + rng() * 499) * 100) / 100;

    // Change percent: biased distribution
    // Draw two values: a raw value and a "role" value
    const role = rng(); // determines whether gainer or loser
    let changePercent: number;
    if (role < 0.5) {
      // Gainer: 0% – +85%
      changePercent = rng() * 85;
    } else {
      // Loser: -55% – 0%
      changePercent = -(rng() * 55);
    }
    changePercent = Math.round(changePercent * 100) / 100;

    // Base volume 100K–50M
    const baseVol = 100_000 + rng() * 49_900_000;
    const relVolume = Math.round((0.5 + rng() * 9.5) * 100) / 100;
    const volume = Math.round(baseVol * relVolume);

    // Float 1M–500M
    const floatM = Math.round((1 + rng() * 499) * 10) / 10;

    // Gap percent -15% to +15%
    const gapPercent = Math.round((-15 + rng() * 30) * 100) / 100;

    return { symbol, name, price, changePercent, volume, relVolume, floatM, gapPercent };
  });
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

function formatFloat(f: number): string {
  if (f >= 100) return Math.round(f) + 'M';
  return f.toFixed(1) + 'M';
}

function formatScanTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Returns the initial daily seed based on UTC day
function dailySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export const Scanner: React.FC<Props> = ({ onSelectSymbol }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Gainers');
  const [seed, setSeed] = useState<number>(dailySeed);
  const [scanTime, setScanTime] = useState<Date>(() => new Date());

  const allRows = useMemo(() => generateRows(seed), [seed]);

  const visibleRows = useMemo((): ScanRow[] => {
    switch (activeTab) {
      case 'Gainers':
        return [...allRows]
          .filter((r) => r.changePercent > 0)
          .sort((a, b) => b.changePercent - a.changePercent);

      case 'Losers':
        return [...allRows]
          .filter((r) => r.changePercent < 0)
          .sort((a, b) => a.changePercent - b.changePercent);

      case 'Volume':
        return [...allRows].sort((a, b) => b.volume - a.volume);

      case 'Momentum':
        return [...allRows]
          .filter((r) => r.changePercent > 10 && r.relVolume > 3)
          .sort((a, b) => b.changePercent - a.changePercent);

      case 'Gappers':
        return [...allRows]
          .filter((r) => Math.abs(r.gapPercent) > 2)
          .sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent));

      default:
        return allRows;
    }
  }, [allRows, activeTab]);

  const handleRefresh = useCallback(() => {
    // XOR with low bits of current timestamp to break the daily seed
    const now = Date.now();
    setSeed(dailySeed() ^ (now & 0xffff));
    setScanTime(new Date());
  }, []);

  const showGapCol = activeTab === 'Gappers';

  return (
    <div
      className="flex flex-col h-full font-sans text-xs select-none"
      style={{ backgroundColor: '#0d1117', color: '#c9d1d9' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: '#21262d', backgroundColor: '#161b22' }}
      >
        <span className="font-semibold tracking-wide text-sm" style={{ color: '#c9d1d9' }}>
          Scanner
        </span>
        <div className="flex items-center gap-3">
          <span style={{ color: '#8b949e' }}>
            Scanned {formatScanTime(scanTime)} ET
          </span>
          <button
            onClick={handleRefresh}
            className="px-2 py-0.5 rounded text-xs font-medium border transition-opacity hover:opacity-80 active:opacity-60"
            style={{
              backgroundColor: '#1f6feb',
              borderColor: '#1f6feb',
              color: '#ffffff',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b flex-shrink-0 overflow-x-auto"
        style={{ borderColor: '#21262d', backgroundColor: '#161b22' }}
      >
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderBottomColor: active ? '#1f6feb' : 'transparent',
                color: active ? '#c9d1d9' : '#8b949e',
                backgroundColor: 'transparent',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Column headers */}
      <div
        className={`grid px-3 py-1 border-b flex-shrink-0 ${showGapCol ? 'grid-cols-6' : 'grid-cols-5'}`}
        style={{ borderColor: '#21262d', backgroundColor: '#161b22' }}
      >
        <span style={{ color: '#8b949e' }}>Symbol</span>
        <span className="text-right" style={{ color: '#8b949e' }}>Price</span>
        <span className="text-right" style={{ color: '#8b949e' }}>Chg%</span>
        <span className="text-right" style={{ color: '#8b949e' }}>Volume</span>
        <span className="text-right" style={{ color: '#8b949e' }}>Float</span>
        {showGapCol && (
          <span className="text-right" style={{ color: '#8b949e' }}>Gap%</span>
        )}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {visibleRows.length === 0 && (
          <div className="px-3 py-8 text-center" style={{ color: '#8b949e' }}>
            No results for this scan.
          </div>
        )}

        {visibleRows.map((row) => {
          const isPos = row.changePercent >= 0;
          const changeColor = isPos ? '#3fb950' : '#f85149';
          const gapPos = row.gapPercent >= 0;
          const gapColor = gapPos ? '#3fb950' : '#f85149';

          return (
            <div
              key={row.symbol}
              onClick={() => onSelectSymbol(row.symbol, row.name)}
              className={`grid px-3 py-[5px] border-b cursor-pointer transition-colors hover:bg-white/[0.03] ${
                showGapCol ? 'grid-cols-6' : 'grid-cols-5'
              }`}
              style={{ borderColor: '#21262d' }}
            >
              {/* Symbol + company name */}
              <div className="flex flex-col min-w-0 justify-center">
                <span className="font-semibold truncate" style={{ color: '#1f6feb' }}>
                  {row.symbol}
                </span>
                <span className="truncate text-[10px]" style={{ color: '#8b949e' }}>
                  {row.name}
                </span>
              </div>

              {/* Price */}
              <span className="text-right self-center" style={{ color: '#c9d1d9' }}>
                ${row.price.toFixed(2)}
              </span>

              {/* Change% badge */}
              <div className="flex items-center justify-end">
                <span
                  className="px-1.5 py-0.5 rounded font-semibold text-[10px]"
                  style={{
                    backgroundColor: isPos
                      ? 'rgba(63,185,80,0.15)'
                      : 'rgba(248,81,73,0.15)',
                    color: changeColor,
                  }}
                >
                  {isPos ? '+' : ''}
                  {row.changePercent.toFixed(2)}%
                </span>
              </div>

              {/* Volume + rel volume */}
              <div className="flex flex-col items-end justify-center">
                <span style={{ color: '#c9d1d9' }}>{formatVolume(row.volume)}</span>
                <span className="text-[10px]" style={{ color: '#8b949e' }}>
                  {row.relVolume.toFixed(1)}x
                </span>
              </div>

              {/* Float */}
              <span className="text-right self-center" style={{ color: '#8b949e' }}>
                {formatFloat(row.floatM)}
              </span>

              {/* Gap% badge — Gappers tab only */}
              {showGapCol && (
                <div className="flex items-center justify-end">
                  <span
                    className="px-1.5 py-0.5 rounded font-semibold text-[10px]"
                    style={{
                      backgroundColor: gapPos
                        ? 'rgba(63,185,80,0.15)'
                        : 'rgba(248,81,73,0.15)',
                      color: gapColor,
                    }}
                  >
                    {gapPos ? '+' : ''}
                    {row.gapPercent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scanner;
