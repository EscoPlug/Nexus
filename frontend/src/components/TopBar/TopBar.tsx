import { useState } from 'react';
import {
  Search, CandlestickChart, LineChart, BarChart2, AreaChart,
  Activity, Camera, Settings, ChevronDown, Wifi, WifiOff,
} from 'lucide-react';
import type { Quote, ChartType, Timeframe, ActiveIndicator } from '../../types';
import IndicatorDialog from '../Chart/IndicatorDialog';

interface Props {
  symbol: string;
  quote: Quote | null;
  loading: boolean;
  chartType: ChartType;
  timeframe: Timeframe;
  indicators: ActiveIndicator[];
  onSymbolSearch: () => void;
  onChartTypeChange: (t: ChartType) => void;
  onTimeframeChange: (t: Timeframe) => void;
  onIndicatorsChange: (indicators: ActiveIndicator[]) => void;
  connected: boolean;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

const CHART_TYPES: { id: ChartType; icon: React.ReactNode; label: string }[] = [
  { id: 'candlestick', icon: <CandlestickChart size={15} />, label: 'Candlestick' },
  { id: 'heikinashi', icon: <CandlestickChart size={15} />, label: 'Heikin Ashi' },
  { id: 'bar', icon: <BarChart2 size={15} />, label: 'OHLC Bar' },
  { id: 'line', icon: <LineChart size={15} />, label: 'Line' },
  { id: 'area', icon: <AreaChart size={15} />, label: 'Area' },
];

function fmt(n: number | undefined, dec = 2) {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtLarge(n: number | undefined) {
  if (!n) return '—';
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

export default function TopBar({
  symbol, quote, loading, chartType, timeframe, indicators,
  onSymbolSearch, onChartTypeChange, onTimeframeChange, onIndicatorsChange, connected,
}: Props) {
  const [showIndicators, setShowIndicators] = useState(false);
  const [showChartMenu, setShowChartMenu] = useState(false);

  const isUp = (quote?.change ?? 0) >= 0;
  const priceColor = isUp ? '#3fb950' : '#f85149';

  const addIndicator = (ind: ActiveIndicator) => {
    onIndicatorsChange([...indicators, ind]);
  };
  const removeIndicator = (id: string) => {
    onIndicatorsChange(indicators.filter(i => i.id !== id));
  };
  const updateIndicator = (id: string, params: Record<string, number | string | boolean>) => {
    onIndicatorsChange(indicators.map(i => i.id === id ? { ...i, params } : i));
  };

  return (
    <>
      {/* ── Desktop top bar (single row) ───────────────────────────────────── */}
      <div className="hidden md:flex items-center h-12 bg-[#161b22] border-b border-[#21262d] px-3 gap-3 select-none flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#1f6feb] to-[#8957e5] flex items-center justify-center">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <span className="text-white font-bold text-sm tracking-tight">NEXUS</span>
        </div>

        <div className="h-5 w-px bg-[#21262d]" />

        <button
          onClick={onSymbolSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors group"
        >
          <Search size={13} className="text-[#8b949e] group-hover:text-white transition-colors" />
          <span className="text-white font-semibold text-sm">{symbol}</span>
          {loading && <span className="w-1.5 h-1.5 rounded-full bg-[#1f6feb] animate-pulse" />}
        </button>

        {quote && (
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono font-bold text-base" style={{ color: priceColor }}>
              {fmt(quote.price)}
            </span>
            <div className="flex flex-col leading-tight">
              <span style={{ color: priceColor }}>
                {isUp ? '+' : ''}{fmt(quote.change)} ({isUp ? '+' : ''}{fmt(quote.changePercent)}%)
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-3 text-[#8b949e]">
              <span>O <span className="text-[#c9d1d9]">{fmt(quote.open)}</span></span>
              <span>H <span className="text-[#3fb950]">{fmt(quote.high)}</span></span>
              <span>L <span className="text-[#f85149]">{fmt(quote.low)}</span></span>
              <span>C <span className="text-[#c9d1d9]">{fmt(quote.prevClose)}</span></span>
              <span className="hidden xl:inline">Vol <span className="text-[#c9d1d9]">{fmtLarge(quote.volume)}</span></span>
              {quote.marketCap && <span className="hidden xl:inline">MCap <span className="text-[#c9d1d9]">{fmtLarge(quote.marketCap)}</span></span>}
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 bg-[#0d1117] rounded-lg p-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                timeframe === tf
                  ? 'bg-[#21262d] text-white'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-[#21262d]" />

        <div className="relative">
          <button
            onClick={() => setShowChartMenu(!showChartMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-all text-xs"
          >
            {CHART_TYPES.find(c => c.id === chartType)?.icon}
            <ChevronDown size={12} />
          </button>
          {showChartMenu && (
            <div className="absolute top-full right-0 mt-1 w-44 bg-[#161b22] border border-[#21262d] rounded-lg shadow-xl z-20 overflow-hidden">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => { onChartTypeChange(ct.id); setShowChartMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    chartType === ct.id ? 'bg-[#1f6feb]/20 text-[#79c0ff]' : 'text-[#c9d1d9] hover:bg-[#21262d]'
                  }`}
                >
                  {ct.icon}
                  {ct.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowIndicators(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-all text-xs"
        >
          <Activity size={14} />
          <span>Indicators</span>
          {indicators.length > 0 && (
            <span className="bg-[#1f6feb] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {indicators.length}
            </span>
          )}
        </button>

        <div className="h-5 w-px bg-[#21262d]" />

        <button className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-all" title="Screenshot">
          <Camera size={14} />
        </button>
        <button className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-all" title="Settings">
          <Settings size={14} />
        </button>

        <div className={`flex items-center gap-1 text-xs ${connected ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        </div>
      </div>

      {/* ── Mobile top bar (two rows) ─────────────────────────────────────── */}
      <div className="md:hidden flex-shrink-0 bg-[#161b22] border-b border-[#21262d] select-none">
        {/* Row 1: logo + symbol + price + connection */}
        <div className="flex items-center h-11 px-3 gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#1f6feb] to-[#8957e5] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">N</span>
          </div>

          <button
            onClick={onSymbolSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors group flex-shrink-0"
          >
            <Search size={12} className="text-[#8b949e]" />
            <span className="text-white font-semibold text-sm">{symbol}</span>
            {loading && <span className="w-1.5 h-1.5 rounded-full bg-[#1f6feb] animate-pulse" />}
          </button>

          {quote && (
            <div className="flex items-center gap-2 text-xs min-w-0 overflow-hidden">
              <span className="font-mono font-bold" style={{ color: priceColor }}>
                {fmt(quote.price)}
              </span>
              <span className="text-[11px] truncate" style={{ color: priceColor }}>
                {isUp ? '+' : ''}{fmt(quote.changePercent)}%
              </span>
            </div>
          )}

          <div className="flex-1" />

          <div className={`flex-shrink-0 ${connected ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          </div>
        </div>

        {/* Row 2: timeframes (scroll) + chart type + indicators */}
        <div className="flex items-center h-9 gap-0 border-t border-[#21262d]/50">
          {/* Timeframe strip — horizontal scroll, hidden scrollbar */}
          <div
            className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-[#21262d] text-white'
                    : 'text-[#8b949e] active:bg-[#21262d]/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-[#21262d] flex-shrink-0" />

          {/* Chart type */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowChartMenu(!showChartMenu)}
              className="flex items-center gap-1 px-2.5 h-9 text-[#8b949e] active:bg-[#21262d] transition-all text-xs"
            >
              {CHART_TYPES.find(c => c.id === chartType)?.icon}
              <ChevronDown size={11} />
            </button>
            {showChartMenu && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-[#161b22] border border-[#21262d] rounded-lg shadow-xl z-20 overflow-hidden">
                {CHART_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => { onChartTypeChange(ct.id); setShowChartMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-3 text-sm transition-colors ${
                      chartType === ct.id ? 'bg-[#1f6feb]/20 text-[#79c0ff]' : 'text-[#c9d1d9] active:bg-[#21262d]'
                    }`}
                  >
                    {ct.icon}
                    {ct.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-[#21262d] flex-shrink-0" />

          {/* Indicators */}
          <button
            onClick={() => setShowIndicators(true)}
            className="flex items-center gap-1 px-2.5 h-9 text-[#8b949e] active:bg-[#21262d] transition-all text-xs flex-shrink-0"
          >
            <Activity size={13} />
            <span>Ind</span>
            {indicators.length > 0 && (
              <span className="bg-[#1f6feb] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {indicators.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {showIndicators && (
        <IndicatorDialog
          activeIndicators={indicators}
          onAdd={addIndicator}
          onRemove={removeIndicator}
          onUpdate={updateIndicator}
          onClose={() => setShowIndicators(false)}
        />
      )}

      {showChartMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowChartMenu(false)} />
      )}
    </>
  );
}
