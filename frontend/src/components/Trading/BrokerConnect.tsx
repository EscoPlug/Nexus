import { useState, useEffect, useCallback, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, ExternalLink, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import {
  checkBrokerStatus,
  fetchAlpacaAccount,
  fetchAlpacaOrders,
  fetchAlpacaPositions,
  type BrokerAccount,
  type BrokerOrder,
  type BrokerPosition,
} from '../../api/broker';

type BrokerFill = { symbol: string; side: string; qty: string; price: string; paper: boolean; at: number };

export default function BrokerConnect() {
  const { brokerMode, setBrokerMode } = useTrading();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [orders, setOrders] = useState<BrokerOrder[]>([]);
  const [positions, setPositions] = useState<BrokerPosition[]>([]);
  const [fills, setFills] = useState<BrokerFill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [showPositions, setShowPositions] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const isPaper = brokerMode === 'alpaca-paper';
  const isAlpaca = brokerMode !== 'sim';

  // Check if backend has API keys configured
  useEffect(() => {
    checkBrokerStatus()
      .then(s => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, []);

  // WebSocket: listen for broker_fill events from backend
  useEffect(() => {
    if (!isAlpaca) return;
    try {
      const ws = new WebSocket(`ws://${window.location.hostname}:3001`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'broker_fill') {
            const d = msg.data;
            const fill: BrokerFill = {
              symbol: d.order?.symbol ?? '',
              side: d.order?.side ?? '',
              qty: d.order?.filled_qty ?? d.order?.qty ?? '',
              price: d.order?.filled_avg_price ?? '',
              paper: msg.paper,
              at: Date.now(),
            };
            setFills(prev => [fill, ...prev].slice(0, 10));
            refresh();
          }
        } catch {}
      };
      ws.onerror = () => ws.close();
    } catch {}
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [isAlpaca]);

  const refresh = useCallback(async () => {
    if (!isAlpaca || !configured) return;
    setLoading(true);
    setError(null);
    try {
      const paper = isPaper;
      const [acc, ords, pos] = await Promise.all([
        fetchAlpacaAccount(paper),
        fetchAlpacaOrders(paper),
        fetchAlpacaPositions(paper),
      ]);
      setAccount(acc);
      setOrders(ords);
      setPositions(pos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  }, [isAlpaca, isPaper, configured]);

  useEffect(() => {
    if (isAlpaca && configured) refresh();
    else { setAccount(null); setOrders([]); setPositions([]); }
  }, [isAlpaca, isPaper, configured]);

  const fmt = (v?: string) => v ? parseFloat(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-';
  const fmtPct = (v?: string) => v ? `${(parseFloat(v) * 100).toFixed(2)}%` : '-';

  return (
    <div className="flex-1 overflow-y-auto text-xs text-[#c9d1d9]">
      {/* Mode selector */}
      <div className="p-3 border-b border-[#21262d]">
        <p className="text-[#8b949e] mb-2 font-medium uppercase tracking-wide text-[10px]">Broker Mode</p>
        <div className="flex flex-col gap-1.5">
          {(
            [
              { mode: 'sim', label: 'Paper Sim', desc: 'Local simulation, no real API' },
              { mode: 'alpaca-paper', label: 'Alpaca Paper', desc: 'Free paper trading via Alpaca' },
              { mode: 'alpaca-live', label: 'Alpaca Live', desc: 'Real money — funded account required' },
            ] as const
          ).map(({ mode, label, desc }) => (
            <button
              key={mode}
              onClick={() => setBrokerMode(mode)}
              className={`flex items-start gap-2 p-2 rounded-lg border text-left transition-all ${
                brokerMode === mode
                  ? mode === 'alpaca-live'
                    ? 'border-[#f85149] bg-[#f85149]/10 text-white'
                    : 'border-[#1f6feb] bg-[#1f6feb]/10 text-white'
                  : 'border-[#21262d] hover:border-[#30363d] text-[#8b949e]'
              }`}
            >
              <span className={`mt-0.5 w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                brokerMode === mode
                  ? mode === 'alpaca-live' ? 'border-[#f85149] bg-[#f85149]' : 'border-[#1f6feb] bg-[#1f6feb]'
                  : 'border-[#484f58]'
              }`} />
              <div className="min-w-0">
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  {label}
                  {mode === 'alpaca-live' && <span className="text-[9px] text-[#f85149] border border-[#f85149]/40 rounded px-1">REAL MONEY</span>}
                </div>
                <div className="text-[10px] text-[#8b949e] mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sim mode: just show a note */}
      {brokerMode === 'sim' && (
        <div className="p-3 text-[#8b949e] text-[11px] leading-relaxed">
          <p>All orders are simulated locally — no real broker connection needed.</p>
          <p className="mt-2">Switch to <span className="text-[#79c0ff]">Alpaca Paper</span> to trade with a free paper account using real market prices.</p>
        </div>
      )}

      {/* Alpaca modes */}
      {isAlpaca && (
        <>
          {/* Configuration status */}
          <div className="p-3 border-b border-[#21262d]">
            {configured === null && (
              <div className="flex items-center gap-2 text-[#8b949e]">
                <RefreshCw size={12} className="animate-spin" />
                Checking configuration…
              </div>
            )}
            {configured === false && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#f85149]">
                  <WifiOff size={12} />
                  <span className="font-medium">API keys not configured</span>
                </div>
                <p className="text-[#8b949e] leading-relaxed">
                  Add your Alpaca keys to <code className="bg-[#21262d] px-1 rounded">backend/.env</code>:
                </p>
                <div className="bg-[#161b22] border border-[#30363d] rounded p-2 font-mono text-[10px] text-[#79c0ff] whitespace-pre">
                  {`ALPACA_KEY_ID=your_key_id\nALPACA_SECRET_KEY=your_secret`}
                </div>
                <a
                  href="https://alpaca.markets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#1f6feb] hover:text-[#388bfd] transition-colors"
                >
                  Get free API keys <ExternalLink size={10} />
                </a>
              </div>
            )}
            {configured === true && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#3fb950]">
                  <Wifi size={12} />
                  <span className="font-medium">
                    {isPaper ? 'Alpaca Paper' : 'Alpaca Live'} connected
                  </span>
                </div>
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="p-1 text-[#8b949e] hover:text-white transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-[#f85149] mt-2">
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Account summary */}
          {account && (
            <div className="p-3 border-b border-[#21262d]">
              <p className="text-[#8b949e] mb-2 font-medium uppercase tracking-wide text-[10px]">Account</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <div className="text-[10px] text-[#8b949e]">Equity</div>
                  <div className="font-mono font-semibold text-white">{fmt(account.equity)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8b949e]">Buying Power</div>
                  <div className="font-mono font-semibold text-[#3fb950]">{fmt(account.buying_power)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8b949e]">Cash</div>
                  <div className="font-mono">{fmt(account.cash)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8b949e]">Status</div>
                  <div className={`capitalize font-medium ${account.status === 'ACTIVE' ? 'text-[#3fb950]' : 'text-[#d29922]'}`}>
                    {account.status?.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent fills */}
          {fills.length > 0 && (
            <div className="p-3 border-b border-[#21262d]">
              <p className="text-[#8b949e] mb-2 font-medium uppercase tracking-wide text-[10px]">Recent Fills</p>
              <div className="space-y-1.5">
                {fills.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={10} className="text-[#3fb950] flex-shrink-0" />
                      <span className={`font-semibold ${f.side === 'buy' ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                        {f.side.toUpperCase()}
                      </span>
                      <span className="font-mono">{f.qty}</span>
                      <span className="text-white font-medium">{f.symbol}</span>
                    </div>
                    <div className="font-mono text-[#8b949e]">{f.price ? `@ $${parseFloat(f.price).toFixed(2)}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positions */}
          {positions.length > 0 && (
            <div className="border-b border-[#21262d]">
              <button
                onClick={() => setShowPositions(v => !v)}
                className="w-full flex items-center justify-between p-3 text-[#8b949e] hover:text-white transition-colors"
              >
                <span className="font-medium uppercase tracking-wide text-[10px]">Positions ({positions.length})</span>
                {showPositions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {showPositions && (
                <div className="px-3 pb-3 space-y-2">
                  {positions.map(p => {
                    const pl = parseFloat(p.unrealized_pl);
                    const plPct = parseFloat(p.unrealized_plpc) * 100;
                    return (
                      <div key={p.symbol} className="bg-[#161b22] rounded p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white">{p.symbol}</span>
                          <span className={`font-mono text-[11px] ${pl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                            {pl >= 0 ? '+' : ''}{pl.toFixed(2)} ({plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#8b949e] text-[10px]">
                          <span>{p.qty} shares · {p.side}</span>
                          <span>avg {fmt(p.avg_entry_price)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {orders.length > 0 && (
            <div className="border-b border-[#21262d]">
              <button
                onClick={() => setShowOrders(v => !v)}
                className="w-full flex items-center justify-between p-3 text-[#8b949e] hover:text-white transition-colors"
              >
                <span className="font-medium uppercase tracking-wide text-[10px]">Orders ({orders.length})</span>
                {showOrders ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {showOrders && (
                <div className="px-3 pb-3 space-y-1.5">
                  {orders.slice(0, 15).map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-2 py-1 border-b border-[#21262d]/50">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-semibold flex-shrink-0 ${o.side === 'buy' ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                          {o.side.toUpperCase()}
                        </span>
                        <span className="font-mono font-medium text-white">{o.symbol}</span>
                        <span className="text-[#8b949e] truncate">{o.qty}sh</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[#8b949e] capitalize">{o.type}</span>
                        <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                          o.status === 'filled' ? 'bg-[#3fb950]/20 text-[#3fb950]' :
                          o.status === 'cancelled' ? 'bg-[#8b949e]/20 text-[#8b949e]' :
                          o.status === 'new' || o.status === 'accepted' ? 'bg-[#1f6feb]/20 text-[#79c0ff]' :
                          'bg-[#d29922]/20 text-[#d29922]'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {configured && !account && !loading && !error && (
            <div className="p-3 text-[#8b949e] text-center text-[11px]">
              Click refresh to load account data.
            </div>
          )}
        </>
      )}
    </div>
  );
}
