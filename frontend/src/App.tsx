import { useState, useMemo } from 'react';
import TopBar from './components/TopBar/TopBar';
import NexusChart from './components/Chart/NexusChart';
import ChartToolbar from './components/Chart/ChartToolbar';
import Watchlist, { DEFAULT_WATCHLIST } from './components/Watchlist/Watchlist';
import NewsPanel from './components/News/NewsPanel';
import MarketTicker from './components/UI/MarketTicker';
import SymbolSearch from './components/TopBar/SymbolSearch';
import { useChartData } from './hooks/useChartData';
import { useLivePrice } from './hooks/useLivePrice';
import type { ChartType, Timeframe, ActiveIndicator, DrawingToolType, WatchlistItem } from './types';

export default function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [symbolName, setSymbolName] = useState('Apple Inc.');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [indicators, setIndicators] = useState<ActiveIndicator[]>([]);
  const [drawingTool, setDrawingTool] = useState<DrawingToolType>('none');
  const [showSearch, setShowSearch] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [showNews, setShowNews] = useState(true);

  const { bars, quote, loading } = useChartData(symbol, timeframe);

  const watchlistSymbols = useMemo(() => watchlist.map(w => w.symbol), [watchlist]);
  const livePrices = useLivePrice(watchlistSymbols);
  const connected = Object.keys(livePrices).length > 0;

  const handleSymbolSelect = (sym: string, name: string) => {
    setSymbol(sym);
    setSymbolName(name);
  };

  const addToWatchlist = (item: WatchlistItem) => {
    if (!watchlist.find(w => w.symbol === item.symbol)) {
      setWatchlist(prev => [...prev, item]);
    }
  };

  const removeFromWatchlist = (sym: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== sym));
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0d1117] overflow-hidden">
      {/* Market ticker */}
      <MarketTicker />

      {/* Top bar */}
      <TopBar
        symbol={symbol}
        quote={quote}
        loading={loading}
        chartType={chartType}
        timeframe={timeframe}
        indicators={indicators}
        connected={connected}
        onSymbolSearch={() => setShowSearch(true)}
        onChartTypeChange={setChartType}
        onTimeframeChange={setTimeframe}
        onIndicatorsChange={setIndicators}
      />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Watchlist sidebar */}
        <Watchlist
          items={watchlist}
          selected={symbol}
          livePrices={livePrices}
          onSelect={handleSymbolSelect}
          onAdd={addToWatchlist}
          onRemove={removeFromWatchlist}
        />

        {/* Chart area */}
        <div className="flex flex-1 min-w-0">
          {/* Drawing toolbar */}
          <ChartToolbar activeTool={drawingTool} onToolChange={setDrawingTool} />

          {/* Chart */}
          <div className="flex-1 min-w-0 relative">
            {bars.length === 0 && loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#1f6feb] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#8b949e] text-sm">Loading {symbol}...</span>
                </div>
              </div>
            )}
            {bars.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-[#8b949e]">
                  <div className="text-4xl mb-3 opacity-20">📈</div>
                  <p className="text-sm">No data available for {symbol}</p>
                  <p className="text-xs mt-1">Try a different symbol or timeframe</p>
                </div>
              </div>
            )}
            <NexusChart
              bars={bars}
              chartType={chartType}
              indicators={indicators}
              drawingTool={drawingTool}
            />
          </div>
        </div>

        {/* News panel */}
        {showNews && <NewsPanel symbol={symbol} />}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between h-6 bg-[#161b22] border-t border-[#21262d] px-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#8b949e] text-[10px]">{symbol} · {symbolName}</span>
          {quote && (
            <span className="text-[#8b949e] text-[10px]">{quote.exchange} · {quote.currency}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#8b949e]">
          {bars.length > 0 && <span>{bars.length} bars</span>}
          {indicators.length > 0 && <span>{indicators.length} indicator{indicators.length !== 1 ? 's' : ''}</span>}
          <button
            onClick={() => setShowNews(!showNews)}
            className="hover:text-white transition-colors"
          >
            {showNews ? 'Hide News' : 'Show News'}
          </button>
          <span>NEXUS v1.0</span>
        </div>
      </div>

      {/* Symbol search modal */}
      {showSearch && (
        <SymbolSearch
          onSelect={handleSymbolSelect}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
