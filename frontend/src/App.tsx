import { useState, useMemo } from 'react';
import TopBar from './components/TopBar/TopBar';
import NexusChart from './components/Chart/NexusChart';
import ChartToolbar from './components/Chart/ChartToolbar';
import Watchlist, { DEFAULT_WATCHLIST } from './components/Watchlist/Watchlist';
import NewsPanel from './components/News/NewsPanel';
import MarketTicker from './components/UI/MarketTicker';
import SymbolSearch from './components/TopBar/SymbolSearch';
import Scanner from './components/Trading/Scanner';
import Level2Panel from './components/Trading/Level2Panel';
import TimeAndSales from './components/Trading/TimeAndSales';
import OrderPanel from './components/Trading/OrderPanel';
import TradingDashboard from './components/Trading/TradingDashboard';
import AlertPanel from './components/Trading/AlertPanel';
import RiskManager from './components/Trading/RiskManager';
import { TradingProvider } from './context/TradingContext';
import { useChartData } from './hooks/useChartData';
import { useLivePrice } from './hooks/useLivePrice';
import type { ChartType, Timeframe, ActiveIndicator, DrawingToolType, WatchlistItem } from './types';
import { Activity } from 'lucide-react';

type RightTab = 'level2' | 'alerts' | 'risk';

function AppInner() {
  const [symbol, setSymbol] = useState('AAPL');
  const [symbolName, setSymbolName] = useState('Apple Inc.');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [indicators, setIndicators] = useState<ActiveIndicator[]>([]);
  const [drawingTool, setDrawingTool] = useState<DrawingToolType>('none');
  const [showSearch, setShowSearch] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [showNews, setShowNews] = useState(false);
  const [simMode, setSimMode] = useState(false);
  const [leftTab, setLeftTab] = useState<'watchlist' | 'scanner'>('watchlist');
  const [rightTab, setRightTab] = useState<RightTab>('level2');

  const { bars, quote, loading, dataSource } = useChartData(symbol, timeframe);

  const watchlistSymbols = useMemo(() => watchlist.map(w => w.symbol), [watchlist]);
  const livePrices = useLivePrice(watchlistSymbols);
  const connected = Object.keys(livePrices).length > 0;

  const currentPrice = quote?.price ?? (bars.length > 0 ? bars[bars.length - 1].close : 0);

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
      <MarketTicker />

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

      {/* Sim mode toggle */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#161b22] border-b border-[#21262d] flex-shrink-0">
        <button
          onClick={() => setSimMode(m => !m)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
            simMode
              ? 'bg-[#1f6feb] text-white shadow-[0_0_8px_rgba(31,111,235,0.4)]'
              : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
          }`}
        >
          <Activity size={12} />
          {simMode ? 'SIM MODE ON' : 'Paper Trading Sim'}
        </button>
        {simMode && (
          <div className="flex items-center gap-1 text-[10px] text-[#3fb950]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
            Paper trading active — no real money
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: Watchlist / Scanner */}
        <div className="w-52 flex-shrink-0 flex flex-col border-r border-[#21262d]">
          {simMode && (
            <div className="flex border-b border-[#21262d]">
              <button
                onClick={() => setLeftTab('watchlist')}
                className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${leftTab === 'watchlist' ? 'text-white border-b-2 border-[#1f6feb]' : 'text-[#8b949e] hover:text-white'}`}
              >
                WATCHLIST
              </button>
              <button
                onClick={() => setLeftTab('scanner')}
                className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${leftTab === 'scanner' ? 'text-white border-b-2 border-[#1f6feb]' : 'text-[#8b949e] hover:text-white'}`}
              >
                SCANNER
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            {(!simMode || leftTab === 'watchlist') ? (
              <Watchlist
                items={watchlist}
                selected={symbol}
                livePrices={livePrices}
                onSelect={handleSymbolSelect}
                onAdd={addToWatchlist}
                onRemove={removeFromWatchlist}
              />
            ) : (
              <Scanner onSelectSymbol={(sym, name) => handleSymbolSelect(sym, name)} />
            )}
          </div>
        </div>

        {/* Center: Chart area */}
        <div className="flex flex-1 min-w-0 flex-col">
          <div className="flex flex-1 min-h-0">
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

            {/* News panel */}
            {showNews && !simMode && <NewsPanel symbol={symbol} />}
          </div>

          {/* Order panel (sim mode only) */}
          {simMode && (
            <OrderPanel symbol={symbol} currentPrice={currentPrice} />
          )}
        </div>

        {/* Right panel (sim mode only) */}
        {simMode && (
          <div className="w-72 flex-shrink-0 flex flex-col border-l border-[#21262d]">
            {/* Right panel tabs */}
            <div className="flex border-b border-[#21262d] flex-shrink-0">
              {(['level2', 'alerts', 'risk'] as RightTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`flex-1 py-1.5 text-[10px] font-semibold uppercase transition-colors ${
                    rightTab === tab ? 'text-white border-b-2 border-[#1f6feb]' : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  {tab === 'level2' ? 'L2 / T&S' : tab === 'alerts' ? 'Alerts' : 'Risk'}
                </button>
              ))}
            </div>

            {rightTab === 'level2' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden" style={{ maxHeight: '55%' }}>
                  <Level2Panel symbol={symbol} currentPrice={currentPrice} />
                </div>
                <div className="border-t border-[#21262d]" style={{ height: '45%', minHeight: 0 }}>
                  <TimeAndSales symbol={symbol} currentPrice={currentPrice} />
                </div>
              </div>
            )}
            {rightTab === 'alerts' && <AlertPanel symbol={symbol} currentPrice={currentPrice} />}
            {rightTab === 'risk' && <RiskManager />}
          </div>
        )}
      </div>

      {/* Trading Dashboard (sim mode only) */}
      {simMode && (
        <div className="h-52 flex-shrink-0 border-t border-[#21262d]">
          <TradingDashboard />
        </div>
      )}

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
          <span className={`px-1.5 py-0.5 rounded font-medium ${
            dataSource === 'yahoo' ? 'bg-[#3fb950]/20 text-[#3fb950]' :
            dataSource === 'backend' ? 'bg-[#1f6feb]/20 text-[#79c0ff]' :
            'bg-[#d29922]/20 text-[#d29922]'
          }`}>
            {dataSource === 'yahoo' ? '● Live' : dataSource === 'backend' ? '● Backend' : '◌ Simulated'}
          </span>
          {!simMode && (
            <button
              onClick={() => setShowNews(n => !n)}
              className="hover:text-white transition-colors"
            >
              {showNews ? 'Hide News' : 'Show News'}
            </button>
          )}
          <span>NEXUS v2.0</span>
        </div>
      </div>

      {showSearch && (
        <SymbolSearch
          onSelect={handleSymbolSelect}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <TradingProvider>
      <AppInner />
    </TradingProvider>
  );
}
