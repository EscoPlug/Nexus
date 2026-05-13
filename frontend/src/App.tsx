import { useState, useMemo } from 'react';
import TopBar from './components/TopBar/TopBar';
import NexusChart from './components/Chart/NexusChart';
import ChartToolbar from './components/Chart/ChartToolbar';
import Watchlist, { DEFAULT_WATCHLIST } from './components/Watchlist/Watchlist';
import NewsPanel from './components/News/NewsPanel';
import MarketTicker from './components/UI/MarketTicker';
import SymbolSearch from './components/TopBar/SymbolSearch';
import { Scanner } from './components/Trading/Scanner';
import Level2Panel from './components/Trading/Level2Panel';
import TimeAndSales from './components/Trading/TimeAndSales';
import OrderPanel from './components/Trading/OrderPanel';
import TradingDashboard from './components/Trading/TradingDashboard';
import AlertPanel from './components/Trading/AlertPanel';
import RiskManager from './components/Trading/RiskManager';
import BrokerConnect from './components/Trading/BrokerConnect';
import { TradingProvider } from './context/TradingContext';
import { useChartData } from './hooks/useChartData';
import { useLivePrice } from './hooks/useLivePrice';
import { useLiveTick } from './hooks/useLiveTick';
import type { ChartType, Timeframe, ActiveIndicator, DrawingToolType, WatchlistItem } from './types';
import { Activity, BarChart2, Star, Search, ShoppingCart, PieChart } from 'lucide-react';

type RightTab = 'level2' | 'alerts' | 'risk' | 'broker';
type LeftTab = 'watchlist' | 'scanner';
type MobileView = 'chart' | 'watchlist' | 'scanner' | 'order' | 'dashboard';
type MobileOrderTab = 'order' | 'broker' | 'l2';

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
  const [leftTab, setLeftTab] = useState<LeftTab>('watchlist');
  const [rightTab, setRightTab] = useState<RightTab>('level2');
  const [mobileView, setMobileView] = useState<MobileView>('chart');
  const [clearDrawings, setClearDrawings] = useState(0);
  const [undoDrawing, setUndoDrawing] = useState(0);
  const [mobileOrderTab, setMobileOrderTab] = useState<MobileOrderTab>('order');

  const { bars, quote, loading, dataSource } = useChartData(symbol, timeframe);
  const watchlistSymbols = useMemo(() => watchlist.map(w => w.symbol), [watchlist]);
  const livePrices = useLivePrice(watchlistSymbols);
  const connected = Object.keys(livePrices).length > 0;
  const lastBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const liveTick = useLiveTick(symbol, timeframe, lastBar);
  const currentPrice = liveTick?.close ?? quote?.price ?? lastBar?.close ?? 0;

  const handleSymbolSelect = (sym: string, name: string) => {
    setSymbol(sym);
    setSymbolName(name);
    setMobileView('chart');
  };

  const addToWatchlist = (item: WatchlistItem) => {
    if (!watchlist.find(w => w.symbol === item.symbol)) {
      setWatchlist(prev => [...prev, item]);
    }
  };

  const removeFromWatchlist = (sym: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== sym));
  };

  const toggleSim = () => {
    setSimMode(m => !m);
    if (!simMode) setMobileView('chart');
  };

  // ── Shared sub-components ─────────────────────────────────────────────────

  const chartArea = (
    <div className="flex-1 min-w-0 relative">
      {bars.length === 0 && loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#1f6feb] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#8b949e] text-sm">Loading {symbol}…</span>
          </div>
        </div>
      )}
      {bars.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-[#8b949e]">
            <div className="text-4xl mb-3 opacity-20">📈</div>
            <p className="text-sm">No data for {symbol}</p>
          </div>
        </div>
      )}
      <NexusChart bars={bars} timeframe={timeframe} chartType={chartType} indicators={indicators} drawingTool={drawingTool} clearDrawings={clearDrawings} undoDrawing={undoDrawing} liveTick={liveTick} />
    </div>
  );

  const dataSourceBadge = (
    <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] ${
      dataSource === 'yahoo' ? 'bg-[#3fb950]/20 text-[#3fb950]' :
      dataSource === 'backend' ? 'bg-[#1f6feb]/20 text-[#79c0ff]' :
      'bg-[#d29922]/20 text-[#d29922]'
    }`}>
      {dataSource === 'yahoo' ? '● Live' : dataSource === 'backend' ? '● Backend' : '◌ Sim'}
    </span>
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────

  const mobileMain = (
    <div className="flex-1 min-h-0 overflow-hidden md:hidden flex flex-col">
      {/* Chart view */}
      <div className={`flex-1 min-h-0 flex-col ${mobileView === 'chart' ? 'flex' : 'hidden'}`}>
        <div className="flex flex-1 min-h-0 relative">
          <ChartToolbar activeTool={drawingTool} onToolChange={setDrawingTool} onClearDrawings={() => setClearDrawings(c => c + 1)} onUndoDrawing={() => setUndoDrawing(c => c + 1)} />
          {chartArea}
          {/* Quick-trade shortcut floating button */}
          {simMode && (
            <button
              onClick={() => setMobileView('order')}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 bg-[#1f6feb] text-white text-xs font-semibold rounded-full shadow-lg active:bg-[#388bfd] transition-colors z-10"
            >
              <ShoppingCart size={13} />
              Trade
            </button>
          )}
        </div>
      </div>

      {/* Watchlist view */}
      {mobileView === 'watchlist' && (
        <Watchlist
          items={watchlist}
          selected={symbol}
          livePrices={livePrices}
          onSelect={handleSymbolSelect}
          onAdd={addToWatchlist}
          onRemove={removeFromWatchlist}
        />
      )}

      {/* Scanner view */}
      {mobileView === 'scanner' && (
        <Scanner onSelectSymbol={handleSymbolSelect} />
      )}

      {/* Order / broker view */}
      {mobileView === 'order' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {simMode ? (
            <>
              {/* Sub-tabs */}
              <div className="flex border-b border-[#21262d] flex-shrink-0 bg-[#161b22]">
                {(['order', 'broker', 'l2'] as MobileOrderTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setMobileOrderTab(tab)}
                    className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                      mobileOrderTab === tab
                        ? 'text-white border-b-2 border-[#1f6feb]'
                        : 'text-[#8b949e]'
                    }`}
                  >
                    {tab === 'l2' ? 'L2 / T&S' : tab === 'broker' ? 'Broker' : 'Order'}
                  </button>
                ))}
              </div>

              {mobileOrderTab === 'order' && (
                <div className="flex-1 overflow-y-auto">
                  <OrderPanel symbol={symbol} currentPrice={currentPrice} />
                </div>
              )}
              {mobileOrderTab === 'broker' && <BrokerConnect />}
              {mobileOrderTab === 'l2' && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="overflow-hidden" style={{ flex: '0 0 55%' }}>
                    <Level2Panel symbol={symbol} currentPrice={currentPrice} />
                  </div>
                  <div className="border-t border-[#21262d] overflow-hidden" style={{ flex: '0 0 45%' }}>
                    <TimeAndSales symbol={symbol} currentPrice={currentPrice} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-[#8b949e] px-6 text-center">
              <Activity size={32} className="opacity-30" />
              <p className="text-sm">Enable Paper Trading Sim to access the order panel and broker settings.</p>
              <button
                onClick={toggleSim}
                className="px-4 py-2.5 bg-[#1f6feb] text-white text-sm font-semibold rounded-lg active:bg-[#388bfd] transition-colors"
              >
                Enable Sim Mode
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dashboard view */}
      {mobileView === 'dashboard' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {simMode ? (
            <TradingDashboard />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-[#8b949e] px-6 text-center">
              <PieChart size={32} className="opacity-30" />
              <p className="text-sm">Enable Paper Trading Sim to see your trading stats.</p>
              <button
                onClick={toggleSim}
                className="px-4 py-2 bg-[#1f6feb] text-white text-sm font-semibold rounded-lg hover:bg-[#388bfd] transition-colors"
              >
                Enable Sim Mode
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const mobileNav = (
    <nav className="md:hidden flex-shrink-0 flex items-stretch h-14 bg-[#161b22] border-t border-[#21262d]">
      {(
        [
          { view: 'chart' as MobileView, icon: BarChart2, label: 'Chart' },
          { view: 'watchlist' as MobileView, icon: Star, label: 'Watch' },
          { view: 'scanner' as MobileView, icon: Search, label: 'Scan' },
          { view: 'order' as MobileView, icon: ShoppingCart, label: 'Order' },
          { view: 'dashboard' as MobileView, icon: PieChart, label: 'Stats' },
        ] as const
      ).map(({ view, icon: Icon, label }) => {
        const active = mobileView === view;
        const isSim = view === 'order' || view === 'dashboard';
        return (
          <button
            key={view}
            onClick={() => setMobileView(view)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
              active ? 'text-white' : isSim && !simMode ? 'text-[#484f58]' : 'text-[#8b949e]'
            }`}
          >
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#1f6feb] rounded-b" />}
            <div className="relative">
              <Icon size={18} />
              {isSim && simMode && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
              )}
            </div>
            <span className="text-[9px] font-medium">{label}</span>
          </button>
        );
      })}

      {/* Sim toggle */}
      <button
        onClick={toggleSim}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
          simMode ? 'text-[#1f6feb]' : 'text-[#8b949e]'
        }`}
      >
        {simMode && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#1f6feb] rounded-b" />}
        <div className="relative">
          <Activity size={18} />
          {simMode && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />}
        </div>
        <span className="text-[9px] font-medium">{simMode ? 'Sim ON' : 'Sim'}</span>
      </button>
    </nav>
  );

  // ── Desktop layout ────────────────────────────────────────────────────────

  const desktopMain = (
    <div className="flex-1 min-h-0 hidden md:flex">
      {/* Left sidebar */}
      <div className="w-48 lg:w-52 flex-shrink-0 flex flex-col border-r border-[#21262d]">
        {simMode && (
          <div className="flex border-b border-[#21262d] flex-shrink-0">
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
            <Scanner onSelectSymbol={handleSymbolSelect} />
          )}
        </div>
      </div>

      {/* Center: chart + order panel */}
      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex flex-1 min-h-0">
          <ChartToolbar activeTool={drawingTool} onToolChange={setDrawingTool} onClearDrawings={() => setClearDrawings(c => c + 1)} onUndoDrawing={() => setUndoDrawing(c => c + 1)} />
          {chartArea}
          {showNews && !simMode && <NewsPanel symbol={symbol} />}
        </div>
        {simMode && <OrderPanel symbol={symbol} currentPrice={currentPrice} />}
      </div>

      {/* Right panel (sim mode) */}
      {simMode && (
        <div className="w-64 xl:w-72 flex-shrink-0 flex flex-col border-l border-[#21262d]">
          <div className="flex border-b border-[#21262d] flex-shrink-0">
            {(['level2', 'alerts', 'risk', 'broker'] as RightTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-1.5 text-[10px] font-semibold uppercase transition-colors ${
                  rightTab === tab ? 'text-white border-b-2 border-[#1f6feb]' : 'text-[#8b949e] hover:text-white'
                }`}
              >
                {tab === 'level2' ? 'L2/T&S' : tab === 'alerts' ? 'Alerts' : tab === 'risk' ? 'Risk' : 'Broker'}
              </button>
            ))}
          </div>
          {rightTab === 'level2' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="overflow-hidden" style={{ flex: '0 0 55%' }}>
                <Level2Panel symbol={symbol} currentPrice={currentPrice} />
              </div>
              <div className="border-t border-[#21262d] overflow-hidden" style={{ flex: '0 0 45%' }}>
                <TimeAndSales symbol={symbol} currentPrice={currentPrice} />
              </div>
            </div>
          )}
          {rightTab === 'alerts' && <AlertPanel symbol={symbol} currentPrice={currentPrice} />}
          {rightTab === 'risk' && <RiskManager />}
          {rightTab === 'broker' && <BrokerConnect />}
        </div>
      )}
    </div>
  );

  const desktopDashboard = simMode && (
    <div className="hidden md:block h-48 xl:h-52 flex-shrink-0 border-t border-[#21262d]">
      <TradingDashboard />
    </div>
  );

  const statusBar = (
    <div className="hidden md:flex items-center justify-between h-6 bg-[#161b22] border-t border-[#21262d] px-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[#8b949e] text-[10px]">{symbol} · {symbolName}</span>
        {quote && <span className="text-[#8b949e] text-[10px]">{quote.exchange} · {quote.currency}</span>}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-[#8b949e]">
        {bars.length > 0 && <span>{bars.length} bars</span>}
        {indicators.length > 0 && <span>{indicators.length} ind</span>}
        {dataSourceBadge}
        {!simMode && (
          <button onClick={() => setShowNews(n => !n)} className="hover:text-white transition-colors">
            {showNews ? 'Hide News' : 'News'}
          </button>
        )}
        <span>NEXUS v2.0</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-full bg-[#0d1117] overflow-hidden">
      {/* Market ticker — hidden on mobile */}
      <div className="hidden md:block flex-shrink-0">
        <MarketTicker />
      </div>

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

      {/* Sim mode toggle bar — desktop only */}
      <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-[#161b22] border-b border-[#21262d] flex-shrink-0">
        <button
          onClick={toggleSim}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
            simMode
              ? 'bg-[#1f6feb] text-white shadow-[0_0_8px_rgba(31,111,235,0.3)]'
              : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
          }`}
        >
          <Activity size={12} />
          {simMode ? 'SIM MODE ON' : 'Paper Trading Sim'}
        </button>
        {simMode && (
          <span className="flex items-center gap-1 text-[10px] text-[#3fb950]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
            Paper trading active — no real money at risk
          </span>
        )}
        <div className="flex-1" />
        {dataSourceBadge}
      </div>

      {/* Desktop layout */}
      {desktopMain}
      {desktopDashboard}

      {/* Mobile layout */}
      {mobileMain}
      {mobileNav}

      {statusBar}

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
