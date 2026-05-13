import React, { useCallback, useMemo, useState } from 'react';
import { RefreshCw, SlidersHorizontal, X, Newspaper } from 'lucide-react';

interface Props {
  onSelectSymbol: (symbol: string, name: string) => void;
}

type Tab = 'Gainers' | 'Losers' | 'Volume' | 'Momentum' | 'Gappers';

interface SymbolMeta {
  symbol: string;
  name: string;
  sector: string;
}

const SYMBOLS: SymbolMeta[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.',               sector: 'Tech' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',           sector: 'Tech' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',              sector: 'Tech' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                sector: 'EV' },
  { symbol: 'META',  name: 'Meta Platforms',            sector: 'Tech' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',    sector: 'Tech' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',              sector: 'Tech' },
  { symbol: 'GME',   name: 'GameStop Corp.',            sector: 'Retail' },
  { symbol: 'AMC',   name: 'AMC Entertainment',         sector: 'Media' },
  { symbol: 'BBBY',  name: 'Bed Bath & Beyond',         sector: 'Retail' },
  { symbol: 'MULN',  name: 'Mullen Automotive',         sector: 'EV' },
  { symbol: 'FFIE',  name: 'Faraday Future',            sector: 'EV' },
  { symbol: 'SOFI',  name: 'SoFi Technologies',         sector: 'Finance' },
  { symbol: 'LCID',  name: 'Lucid Group',               sector: 'EV' },
  { symbol: 'RIVN',  name: 'Rivian Automotive',         sector: 'EV' },
  { symbol: 'PLTR',  name: 'Palantir Technologies',     sector: 'Tech' },
  { symbol: 'COIN',  name: 'Coinbase Global',           sector: 'Crypto' },
  { symbol: 'HOOD',  name: 'Robinhood Markets',         sector: 'Finance' },
  { symbol: 'MARA',  name: 'Marathon Digital',          sector: 'Crypto' },
  { symbol: 'RIOT',  name: 'Riot Platforms',            sector: 'Crypto' },
  { symbol: 'SNDL',  name: 'Sundial Growers',           sector: 'Cannabis' },
  { symbol: 'CLOV',  name: 'Clover Health',             sector: 'Health' },
  { symbol: 'WISH',  name: 'ContextLogic Inc.',         sector: 'Retail' },
  { symbol: 'BB',    name: 'BlackBerry Ltd.',           sector: 'Tech' },
  { symbol: 'NOK',   name: 'Nokia Corp.',               sector: 'Tech' },
  { symbol: 'SPCE',  name: 'Virgin Galactic',           sector: 'Aero' },
  { symbol: 'BYND',  name: 'Beyond Meat',               sector: 'Food' },
  { symbol: 'WKHS',  name: 'Workhorse Group',           sector: 'EV' },
  { symbol: 'NKLA',  name: 'Nikola Corp.',              sector: 'EV' },
  { symbol: 'SENS',  name: 'Senseonics Holdings',       sector: 'Health' },
  { symbol: 'IONQ',  name: 'IonQ Inc.',                 sector: 'Tech' },
  { symbol: 'RKLB',  name: 'Rocket Lab USA',            sector: 'Aero' },
  { symbol: 'OPEN',  name: 'Opendoor Technologies',     sector: 'Finance' },
  { symbol: 'CTRM',  name: 'Castor Maritime',           sector: 'Energy' },
  { symbol: 'TLRY',  name: 'Tilray Brands',             sector: 'Cannabis' },
  { symbol: 'ATOS',  name: 'Atossa Therapeutics',       sector: 'Health' },
  { symbol: 'IDEX',  name: 'Ideanomics Inc.',           sector: 'EV' },
  { symbol: 'NAKD',  name: 'Naked Brand Group',         sector: 'Retail' },
  { symbol: 'EXPR',  name: 'Express Inc.',              sector: 'Retail' },
  { symbol: 'KOSS',  name: 'Koss Corp.',                sector: 'Tech' },
];

const TABS: Tab[] = ['Gainers', 'Losers', 'Volume', 'Momentum', 'Gappers'];

const ALL_SECTORS = Array.from(new Set(SYMBOLS.map(s => s.sector))).sort();

// ── PRNG helpers ────────────────────────────────────────────────────────────

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

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

// ── Data types ───────────────────────────────────────────────────────────────

interface ScanRow {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  volume: number;
  relVolume: number;
  floatM: number;
  gapPercent: number;
  hasNews: boolean;
  newsHeadline: string;
}

const NEWS_HEADLINES = [
  'Beats earnings estimates, raises guidance',
  'CEO announces share buyback program',
  'Partnership deal with major tech firm',
  'FDA approval received for new product',
  'Short squeeze alert: high short interest',
  'Analyst upgrades to Buy with new target',
  'New contract worth $500M announced',
  'Insider buying detected in past 24h',
  'Breaking: acquisition rumors circulating',
  'Q3 revenue up 40% YoY, guidance raised',
];

function generateRows(dailySeed: number): ScanRow[] {
  return SYMBOLS.map(({ symbol, name, sector }) => {
    const seed = strHash(symbol) ^ (dailySeed >>> 0);
    const rng = mulberry32(seed);

    const price = Math.round((1 + rng() * 499) * 100) / 100;

    const role = rng();
    let changePercent: number;
    if (role < 0.5) changePercent = rng() * 85;
    else changePercent = -(rng() * 55);
    changePercent = Math.round(changePercent * 100) / 100;

    const baseVol = 100_000 + rng() * 49_900_000;
    const relVolume = Math.round((0.5 + rng() * 9.5) * 100) / 100;
    const volume = Math.round(baseVol * relVolume);
    const floatM = Math.round((1 + rng() * 499) * 10) / 10;
    const gapPercent = Math.round((-15 + rng() * 30) * 100) / 100;

    const hasNews = rng() > 0.55;
    const headlineIdx = Math.floor(rng() * NEWS_HEADLINES.length);
    const newsHeadline = NEWS_HEADLINES[headlineIdx];

    return { symbol, name, sector, price, changePercent, volume, relVolume, floatM, gapPercent, hasNews, newsHeadline };
  });
}

// ── Filter state ─────────────────────────────────────────────────────────────

interface Filters {
  minPrice: string;
  maxPrice: string;
  minChange: string;
  maxChange: string;
  minRelVol: string;
  hasNewsOnly: boolean;
  sector: string;
}

const DEFAULT_FILTERS: Filters = {
  minPrice: '',
  maxPrice: '',
  minChange: '',
  maxChange: '',
  minRelVol: '',
  hasNewsOnly: false,
  sector: '',
};

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.minPrice) n++;
  if (f.maxPrice) n++;
  if (f.minChange) n++;
  if (f.maxChange) n++;
  if (f.minRelVol) n++;
  if (f.hasNewsOnly) n++;
  if (f.sector) n++;
  return n;
}

function applyFilters(rows: ScanRow[], f: Filters): ScanRow[] {
  return rows.filter(r => {
    if (f.minPrice && r.price < parseFloat(f.minPrice)) return false;
    if (f.maxPrice && r.price > parseFloat(f.maxPrice)) return false;
    if (f.minChange && r.changePercent < parseFloat(f.minChange)) return false;
    if (f.maxChange && r.changePercent > parseFloat(f.maxChange)) return false;
    if (f.minRelVol && r.relVolume < parseFloat(f.minRelVol)) return false;
    if (f.hasNewsOnly && !r.hasNews) return false;
    if (f.sector && r.sector !== f.sector) return false;
    return true;
  });
}

// ── Formatting ────────────────────────────────────────────────────────────────

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
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dailySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Scanner: React.FC<Props> = ({ onSelectSymbol }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Gainers');
  const [seed, setSeed] = useState<number>(dailySeed);
  const [scanTime, setScanTime] = useState<Date>(() => new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [hoveredNews, setHoveredNews] = useState<string | null>(null);

  const allRows = useMemo(() => generateRows(seed), [seed]);

  const tabRows = useMemo((): ScanRow[] => {
    switch (activeTab) {
      case 'Gainers':
        return [...allRows].filter(r => r.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
      case 'Losers':
        return [...allRows].filter(r => r.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
      case 'Volume':
        return [...allRows].sort((a, b) => b.volume - a.volume);
      case 'Momentum':
        return [...allRows].filter(r => r.changePercent > 10 && r.relVolume > 3).sort((a, b) => b.changePercent - a.changePercent);
      case 'Gappers':
        return [...allRows].filter(r => Math.abs(r.gapPercent) > 2).sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent));
      default:
        return allRows;
    }
  }, [allRows, activeTab]);

  const visibleRows = useMemo(() => applyFilters(tabRows, filters), [tabRows, filters]);

  const activeFilterCount = countActiveFilters(filters);

  const handleRefresh = useCallback(() => {
    setSeed(dailySeed() ^ (Date.now() & 0xffff));
    setScanTime(new Date());
  }, []);

  const setFilter = (key: keyof Filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const showGapCol = activeTab === 'Gappers';

  return (
    <div className="flex flex-col h-full text-xs select-none bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#161b22] flex-shrink-0">
        <span className="font-semibold text-sm">Scanner</span>
        <div className="flex items-center gap-2">
          <span className="text-[#8b949e] text-[10px]">{formatScanTime(scanTime)}</span>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#1f6feb]/20 border-[#1f6feb]/60 text-[#79c0ff]'
                : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-white'
            }`}
          >
            <SlidersHorizontal size={11} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#1f6feb] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[#1f6feb] text-white hover:bg-[#388bfd] transition-colors"
          >
            <RefreshCw size={10} />
            Scan
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="border-b border-[#21262d] bg-[#161b22] flex-shrink-0 p-2.5 space-y-2">
          {/* Row 1: price + change */}
          <div className="flex flex-wrap gap-2">
            {/* Price range */}
            <div className="flex items-center gap-1">
              <span className="text-[#8b949e] text-[10px] whitespace-nowrap">Price $</span>
              <input
                type="number"
                placeholder="min"
                value={filters.minPrice}
                onChange={e => setFilter('minPrice', e.target.value)}
                className="w-14 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#1f6feb] font-mono"
              />
              <span className="text-[#484f58] text-[10px]">–</span>
              <input
                type="number"
                placeholder="max"
                value={filters.maxPrice}
                onChange={e => setFilter('maxPrice', e.target.value)}
                className="w-14 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#1f6feb] font-mono"
              />
            </div>

            {/* Change% range */}
            <div className="flex items-center gap-1">
              <span className="text-[#8b949e] text-[10px] whitespace-nowrap">Chg%</span>
              <input
                type="number"
                placeholder="min"
                value={filters.minChange}
                onChange={e => setFilter('minChange', e.target.value)}
                className="w-14 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#1f6feb] font-mono"
              />
              <span className="text-[#484f58] text-[10px]">–</span>
              <input
                type="number"
                placeholder="max"
                value={filters.maxChange}
                onChange={e => setFilter('maxChange', e.target.value)}
                className="w-14 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#1f6feb] font-mono"
              />
            </div>

            {/* Min rel. volume */}
            <div className="flex items-center gap-1">
              <span className="text-[#8b949e] text-[10px] whitespace-nowrap">RelVol ≥</span>
              <select
                value={filters.minRelVol}
                onChange={e => setFilter('minRelVol', e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#1f6feb]"
              >
                <option value="">Any</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
              </select>
            </div>
          </div>

          {/* Row 2: news + sector + clear */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Has news toggle */}
            <button
              onClick={() => setFilter('hasNewsOnly', !filters.hasNewsOnly)}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium transition-colors ${
                filters.hasNewsOnly
                  ? 'bg-[#d29922]/20 border-[#d29922]/60 text-[#d29922]'
                  : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-white'
              }`}
            >
              <Newspaper size={10} />
              Has News
            </button>

            {/* Sector filter */}
            <select
              value={filters.sector}
              onChange={e => setFilter('sector', e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#1f6feb]"
            >
              <option value="">All Sectors</option>
              {ALL_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 rounded border border-[#f85149]/40 text-[#f85149] bg-[#f85149]/10 hover:bg-[#f85149]/20 text-[10px] font-medium transition-colors"
              >
                <X size={10} />
                Clear
              </button>
            )}

            <span className="text-[#8b949e] text-[10px] ml-auto">
              {visibleRows.length} / {tabRows.length} results
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#21262d] bg-[#161b22] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === activeTab
                ? 'border-[#1f6feb] text-[#c9d1d9]'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className={`grid px-3 py-1 border-b border-[#21262d] bg-[#161b22] flex-shrink-0 text-[#8b949e] ${showGapCol ? 'grid-cols-6' : 'grid-cols-5'}`}>
        <span>Symbol</span>
        <span className="text-right">Price</span>
        <span className="text-right">Chg%</span>
        <span className="text-right">Volume</span>
        <span className="text-right">{showGapCol ? 'Gap%' : 'Float'}</span>
        {showGapCol && <span className="text-right">RelVol</span>}
      </div>

      {/* News tooltip */}
      {hoveredNews && (
        <div className="absolute z-20 left-2 right-2 bg-[#161b22] border border-[#d29922]/40 rounded-lg px-3 py-2 text-[11px] text-[#d29922] shadow-xl pointer-events-none" style={{ top: '4rem' }}>
          <Newspaper size={10} className="inline mr-1.5" />
          {hoveredNews}
        </div>
      )}

      {/* Rows */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {visibleRows.length === 0 && (
          <div className="px-3 py-8 text-center text-[#8b949e]">
            {activeFilterCount > 0 ? 'No results match your filters.' : 'No results for this scan.'}
          </div>
        )}

        {visibleRows.map(row => {
          const isPos = row.changePercent >= 0;
          const changeColor = isPos ? '#3fb950' : '#f85149';
          const gapPos = row.gapPercent >= 0;
          const gapColor = gapPos ? '#3fb950' : '#f85149';

          return (
            <div
              key={row.symbol}
              onClick={() => onSelectSymbol(row.symbol, row.name)}
              className={`grid px-3 py-[5px] border-b border-[#21262d] cursor-pointer transition-colors hover:bg-white/[0.03] ${
                showGapCol ? 'grid-cols-6' : 'grid-cols-5'
              }`}
            >
              {/* Symbol + name + news dot */}
              <div className="flex flex-col min-w-0 justify-center">
                <div className="flex items-center gap-1">
                  <span className="font-semibold truncate text-[#1f6feb]">{row.symbol}</span>
                  {row.hasNews && (
                    <button
                      onClick={e => { e.stopPropagation(); }}
                      onMouseEnter={() => setHoveredNews(row.newsHeadline)}
                      onMouseLeave={() => setHoveredNews(null)}
                      className="flex-shrink-0"
                      title={row.newsHeadline}
                    >
                      <Newspaper size={9} className="text-[#d29922]" />
                    </button>
                  )}
                </div>
                <span className="truncate text-[10px] text-[#8b949e]">{row.sector}</span>
              </div>

              {/* Price */}
              <span className="text-right self-center text-[#c9d1d9]">
                ${row.price.toFixed(2)}
              </span>

              {/* Change% badge */}
              <div className="flex items-center justify-end">
                <span
                  className="px-1.5 py-0.5 rounded font-semibold text-[10px]"
                  style={{
                    backgroundColor: isPos ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
                    color: changeColor,
                  }}
                >
                  {isPos ? '+' : ''}{row.changePercent.toFixed(2)}%
                </span>
              </div>

              {/* Volume + rel volume */}
              <div className="flex flex-col items-end justify-center">
                <span className="text-[#c9d1d9]">{formatVolume(row.volume)}</span>
                <span className="text-[10px] text-[#8b949e]">{row.relVolume.toFixed(1)}x</span>
              </div>

              {/* Float or Gap% */}
              {showGapCol ? (
                <div className="flex items-center justify-end">
                  <span
                    className="px-1.5 py-0.5 rounded font-semibold text-[10px]"
                    style={{
                      backgroundColor: gapPos ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
                      color: gapColor,
                    }}
                  >
                    {gapPos ? '+' : ''}{row.gapPercent.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <span className="text-right self-center text-[#8b949e]">
                  {formatFloat(row.floatM)}
                </span>
              )}

              {/* RelVol (Gappers only) */}
              {showGapCol && (
                <span className="text-right self-center text-[#8b949e]">
                  {row.relVolume.toFixed(1)}x
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scanner;
