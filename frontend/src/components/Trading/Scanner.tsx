import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, SlidersHorizontal, X, Newspaper, Wifi } from 'lucide-react';
import { fetchLiveScannerData } from '../../api/scanner';
import type { LiveScanRow } from '../../api/scanner';

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
  // ── Tech ──────────────────────────────────────────────────────────────────
  { symbol: 'AAPL',  name: 'Apple Inc.',                    sector: 'Tech' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',               sector: 'Tech' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',                  sector: 'Tech' },
  { symbol: 'META',  name: 'Meta Platforms',                sector: 'Tech' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',                 sector: 'Tech' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',               sector: 'Tech' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                    sector: 'Tech' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',        sector: 'Tech' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',                  sector: 'Tech' },
  { symbol: 'CRM',   name: 'Salesforce Inc.',               sector: 'Tech' },
  { symbol: 'ORCL',  name: 'Oracle Corp.',                  sector: 'Tech' },
  { symbol: 'ADBE',  name: 'Adobe Inc.',                    sector: 'Tech' },
  { symbol: 'INTC',  name: 'Intel Corp.',                   sector: 'Tech' },
  { symbol: 'QCOM',  name: 'Qualcomm Inc.',                 sector: 'Tech' },
  { symbol: 'TXN',   name: 'Texas Instruments',             sector: 'Tech' },
  { symbol: 'AVGO',  name: 'Broadcom Inc.',                 sector: 'Tech' },
  { symbol: 'AMAT',  name: 'Applied Materials',             sector: 'Tech' },
  { symbol: 'MU',    name: 'Micron Technology',             sector: 'Tech' },
  { symbol: 'LRCX',  name: 'Lam Research Corp.',            sector: 'Tech' },
  { symbol: 'MRVL',  name: 'Marvell Technology',            sector: 'Tech' },
  { symbol: 'ON',    name: 'ON Semiconductor',              sector: 'Tech' },
  { symbol: 'NXPI',  name: 'NXP Semiconductors',            sector: 'Tech' },
  { symbol: 'FTNT',  name: 'Fortinet Inc.',                 sector: 'Tech' },
  { symbol: 'PANW',  name: 'Palo Alto Networks',            sector: 'Tech' },
  { symbol: 'CRWD',  name: 'CrowdStrike Holdings',          sector: 'Tech' },
  { symbol: 'NET',   name: 'Cloudflare Inc.',               sector: 'Tech' },
  { symbol: 'ZS',    name: 'Zscaler Inc.',                  sector: 'Tech' },
  { symbol: 'DDOG',  name: 'Datadog Inc.',                  sector: 'Tech' },
  { symbol: 'SNOW',  name: 'Snowflake Inc.',                sector: 'Tech' },
  { symbol: 'MDB',   name: 'MongoDB Inc.',                  sector: 'Tech' },
  { symbol: 'PLTR',  name: 'Palantir Technologies',         sector: 'Tech' },
  { symbol: 'RBLX',  name: 'Roblox Corp.',                  sector: 'Tech' },
  { symbol: 'U',     name: 'Unity Software',                sector: 'Tech' },
  { symbol: 'IONQ',  name: 'IonQ Inc.',                     sector: 'Tech' },
  { symbol: 'BB',    name: 'BlackBerry Ltd.',               sector: 'Tech' },
  { symbol: 'NOK',   name: 'Nokia Corp.',                   sector: 'Tech' },
  { symbol: 'KOSS',  name: 'Koss Corp.',                    sector: 'Tech' },
  // ── Finance ───────────────────────────────────────────────────────────────
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',          sector: 'Finance' },
  { symbol: 'BAC',   name: 'Bank of America Corp.',         sector: 'Finance' },
  { symbol: 'WFC',   name: 'Wells Fargo & Co.',             sector: 'Finance' },
  { symbol: 'GS',    name: 'Goldman Sachs Group',           sector: 'Finance' },
  { symbol: 'MS',    name: 'Morgan Stanley',                sector: 'Finance' },
  { symbol: 'C',     name: 'Citigroup Inc.',                sector: 'Finance' },
  { symbol: 'BLK',   name: 'BlackRock Inc.',                sector: 'Finance' },
  { symbol: 'SCHW',  name: 'Charles Schwab Corp.',          sector: 'Finance' },
  { symbol: 'AXP',   name: 'American Express Co.',          sector: 'Finance' },
  { symbol: 'V',     name: 'Visa Inc.',                     sector: 'Finance' },
  { symbol: 'MA',    name: 'Mastercard Inc.',               sector: 'Finance' },
  { symbol: 'PYPL',  name: 'PayPal Holdings',               sector: 'Finance' },
  { symbol: 'COIN',  name: 'Coinbase Global',               sector: 'Crypto' },
  { symbol: 'HOOD',  name: 'Robinhood Markets',             sector: 'Finance' },
  { symbol: 'SOFI',  name: 'SoFi Technologies',             sector: 'Finance' },
  { symbol: 'OPEN',  name: 'Opendoor Technologies',         sector: 'Finance' },
  // ── Healthcare ────────────────────────────────────────────────────────────
  { symbol: 'UNH',   name: 'UnitedHealth Group',            sector: 'Health' },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',             sector: 'Health' },
  { symbol: 'LLY',   name: 'Eli Lilly and Co.',             sector: 'Health' },
  { symbol: 'PFE',   name: 'Pfizer Inc.',                   sector: 'Health' },
  { symbol: 'MRK',   name: 'Merck & Co.',                   sector: 'Health' },
  { symbol: 'ABBV',  name: 'AbbVie Inc.',                   sector: 'Health' },
  { symbol: 'TMO',   name: 'Thermo Fisher Scientific',      sector: 'Health' },
  { symbol: 'ABT',   name: 'Abbott Laboratories',           sector: 'Health' },
  { symbol: 'AMGN',  name: 'Amgen Inc.',                    sector: 'Health' },
  { symbol: 'GILD',  name: 'Gilead Sciences',               sector: 'Health' },
  { symbol: 'REGN',  name: 'Regeneron Pharmaceuticals',     sector: 'Health' },
  { symbol: 'VRTX',  name: 'Vertex Pharmaceuticals',        sector: 'Health' },
  { symbol: 'MRNA',  name: 'Moderna Inc.',                  sector: 'Health' },
  { symbol: 'BIIB',  name: 'Biogen Inc.',                   sector: 'Health' },
  { symbol: 'CLOV',  name: 'Clover Health',                 sector: 'Health' },
  { symbol: 'SENS',  name: 'Senseonics Holdings',           sector: 'Health' },
  { symbol: 'ATOS',  name: 'Atossa Therapeutics',           sector: 'Health' },
  // ── Energy ────────────────────────────────────────────────────────────────
  { symbol: 'XOM',   name: 'Exxon Mobil Corp.',             sector: 'Energy' },
  { symbol: 'CVX',   name: 'Chevron Corp.',                 sector: 'Energy' },
  { symbol: 'COP',   name: 'ConocoPhillips',                sector: 'Energy' },
  { symbol: 'OXY',   name: 'Occidental Petroleum',          sector: 'Energy' },
  { symbol: 'EOG',   name: 'EOG Resources',                 sector: 'Energy' },
  { symbol: 'DVN',   name: 'Devon Energy Corp.',            sector: 'Energy' },
  { symbol: 'BKR',   name: 'Baker Hughes Co.',              sector: 'Energy' },
  { symbol: 'HAL',   name: 'Halliburton Co.',               sector: 'Energy' },
  { symbol: 'SLB',   name: 'SLB (Schlumberger)',            sector: 'Energy' },
  { symbol: 'PSX',   name: 'Phillips 66',                   sector: 'Energy' },
  { symbol: 'CTRM',  name: 'Castor Maritime',               sector: 'Energy' },
  // ── Consumer / Retail ─────────────────────────────────────────────────────
  { symbol: 'WMT',   name: 'Walmart Inc.',                  sector: 'Retail' },
  { symbol: 'COST',  name: 'Costco Wholesale',              sector: 'Retail' },
  { symbol: 'TGT',   name: 'Target Corp.',                  sector: 'Retail' },
  { symbol: 'HD',    name: 'Home Depot Inc.',               sector: 'Retail' },
  { symbol: 'LOW',   name: "Lowe's Companies",              sector: 'Retail' },
  { symbol: 'NKE',   name: 'NIKE Inc.',                     sector: 'Retail' },
  { symbol: 'MCD',   name: "McDonald's Corp.",              sector: 'Retail' },
  { symbol: 'SBUX',  name: 'Starbucks Corp.',               sector: 'Retail' },
  { symbol: 'CMG',   name: 'Chipotle Mexican Grill',        sector: 'Retail' },
  { symbol: 'GME',   name: 'GameStop Corp.',                sector: 'Retail' },
  { symbol: 'AMC',   name: 'AMC Entertainment',             sector: 'Media' },
  { symbol: 'BBBY',  name: 'Bed Bath & Beyond',             sector: 'Retail' },
  { symbol: 'EXPR',  name: 'Express Inc.',                  sector: 'Retail' },
  { symbol: 'NAKD',  name: 'Naked Brand Group',             sector: 'Retail' },
  { symbol: 'WISH',  name: 'ContextLogic Inc.',             sector: 'Retail' },
  // ── Industrial / Aerospace ────────────────────────────────────────────────
  { symbol: 'GE',    name: 'GE Aerospace',                  sector: 'Industrial' },
  { symbol: 'HON',   name: 'Honeywell International',       sector: 'Industrial' },
  { symbol: 'BA',    name: 'Boeing Co.',                    sector: 'Industrial' },
  { symbol: 'CAT',   name: 'Caterpillar Inc.',              sector: 'Industrial' },
  { symbol: 'DE',    name: 'Deere & Company',               sector: 'Industrial' },
  { symbol: 'UNP',   name: 'Union Pacific Corp.',           sector: 'Industrial' },
  { symbol: 'UPS',   name: 'United Parcel Service',         sector: 'Industrial' },
  { symbol: 'FDX',   name: 'FedEx Corp.',                   sector: 'Industrial' },
  { symbol: 'LMT',   name: 'Lockheed Martin Corp.',         sector: 'Industrial' },
  { symbol: 'RTX',   name: 'RTX Corp.',                     sector: 'Industrial' },
  { symbol: 'GD',    name: 'General Dynamics Corp.',        sector: 'Industrial' },
  { symbol: 'RKLB',  name: 'Rocket Lab USA',                sector: 'Aero' },
  { symbol: 'SPCE',  name: 'Virgin Galactic',               sector: 'Aero' },
  // ── EV ────────────────────────────────────────────────────────────────────
  { symbol: 'LCID',  name: 'Lucid Group',                   sector: 'EV' },
  { symbol: 'RIVN',  name: 'Rivian Automotive',             sector: 'EV' },
  { symbol: 'NIO',   name: 'NIO Inc.',                      sector: 'EV' },
  { symbol: 'XPEV',  name: 'XPeng Inc.',                    sector: 'EV' },
  { symbol: 'LI',    name: 'Li Auto Inc.',                  sector: 'EV' },
  { symbol: 'MULN',  name: 'Mullen Automotive',             sector: 'EV' },
  { symbol: 'FFIE',  name: 'Faraday Future',                sector: 'EV' },
  { symbol: 'WKHS',  name: 'Workhorse Group',               sector: 'EV' },
  { symbol: 'NKLA',  name: 'Nikola Corp.',                  sector: 'EV' },
  { symbol: 'IDEX',  name: 'Ideanomics Inc.',               sector: 'EV' },
  // ── Crypto-adjacent ───────────────────────────────────────────────────────
  { symbol: 'MARA',  name: 'Marathon Digital',              sector: 'Crypto' },
  { symbol: 'RIOT',  name: 'Riot Platforms',                sector: 'Crypto' },
  // ── Cannabis ──────────────────────────────────────────────────────────────
  { symbol: 'SNDL',  name: 'Sundial Growers',               sector: 'Cannabis' },
  { symbol: 'TLRY',  name: 'Tilray Brands',                 sector: 'Cannabis' },
  // ── Food / Beverage ───────────────────────────────────────────────────────
  { symbol: 'KO',    name: 'The Coca-Cola Company',         sector: 'Food' },
  { symbol: 'PEP',   name: 'PepsiCo Inc.',                  sector: 'Food' },
  { symbol: 'BYND',  name: 'Beyond Meat',                   sector: 'Food' },
  { symbol: 'MO',    name: 'Altria Group',                  sector: 'Food' },
  // ── Media / Telecom ───────────────────────────────────────────────────────
  { symbol: 'DIS',   name: 'The Walt Disney Co.',           sector: 'Media' },
  { symbol: 'PARA',  name: 'Paramount Global',              sector: 'Media' },
  { symbol: 'WBD',   name: 'Warner Bros. Discovery',        sector: 'Media' },
  { symbol: 'T',     name: 'AT&T Inc.',                     sector: 'Telecom' },
  { symbol: 'VZ',    name: 'Verizon Communications',        sector: 'Telecom' },
  { symbol: 'TMUS',  name: 'T-Mobile US',                   sector: 'Telecom' },
];

const TABS: Tab[] = ['Gainers', 'Losers', 'Volume', 'Momentum', 'Gappers'];

const ALL_SECTORS = Array.from(new Set(SYMBOLS.map(s => s.sector))).sort();

// ── PRNG helpers ─────────────────────────────────────────────────────────────

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

// ── Data types ────────────────────────────────────────────────────────────────

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
  if (f <= 0) return '—';
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

  // Live data state
  const [liveRows, setLiveRows] = useState<LiveScanRow[] | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const allSimRows = useMemo(() => generateRows(seed), [seed]);

  const simTabRows = useMemo((): ScanRow[] => {
    switch (activeTab) {
      case 'Gainers':
        return [...allSimRows].filter(r => r.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
      case 'Losers':
        return [...allSimRows].filter(r => r.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
      case 'Volume':
        return [...allSimRows].sort((a, b) => b.volume - a.volume);
      case 'Momentum':
        return [...allSimRows].filter(r => r.changePercent > 10 && r.relVolume > 3).sort((a, b) => b.changePercent - a.changePercent);
      case 'Gappers':
        return [...allSimRows].filter(r => Math.abs(r.gapPercent) > 2).sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent));
      default:
        return allSimRows;
    }
  }, [allSimRows, activeTab]);

  const tabRows: ScanRow[] = liveRows ?? simTabRows;
  const visibleRows = useMemo(() => applyFilters(tabRows, filters), [tabRows, filters]);
  const activeFilterCount = countActiveFilters(filters);

  const fetchLive = useCallback(async (tab: Tab) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const result = await fetchLiveScannerData(tab.toLowerCase());
      if (result.source === 'live') {
        setLiveRows(result.rows);
        setIsLive(true);
        setScanTime(new Date(result.lastUpdated ?? Date.now()));
      } else {
        setLiveRows(null);
        setIsLive(false);
      }
    } catch {
      setLiveRows(null);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and tab change
  useEffect(() => {
    fetchLive(activeTab);
    return () => { abortRef.current?.abort(); };
  }, [activeTab, fetchLive]);

  const handleRefresh = useCallback(() => {
    setSeed(dailySeed() ^ (Date.now() & 0xffff));
    fetchLive(activeTab);
    if (!isLive) setScanTime(new Date());
  }, [activeTab, fetchLive, isLive]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setLiveRows(null);
  };

  const setFilter = (key: keyof Filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const showGapCol = activeTab === 'Gappers';

  return (
    <div className="flex flex-col h-full text-xs select-none bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Scanner</span>
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#3fb950]/15 border border-[#3fb950]/40 rounded text-[9px] font-bold text-[#3fb950] uppercase tracking-wide">
              <Wifi size={8} />
              Live
            </span>
          )}
          {loading && (
            <span className="text-[#8b949e] text-[10px] animate-pulse">loading…</span>
          )}
        </div>
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
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[#1f6feb] text-white hover:bg-[#388bfd] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
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
              {isLive && <span className="ml-1 text-[#3fb950]">· NYSE/NASDAQ</span>}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#21262d] bg-[#161b22] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
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
        {loading && tabRows.length === 0 && (
          <div className="px-3 py-8 text-center text-[#8b949e]">
            Fetching NYSE/NASDAQ data…
          </div>
        )}

        {!loading && visibleRows.length === 0 && (
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
                <span className="truncate text-[10px] text-[#8b949e]">{row.sector || row.name}</span>
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
