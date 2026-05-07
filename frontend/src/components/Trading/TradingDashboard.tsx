import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart2, BookOpen, Award, RefreshCw, Trash2, Target } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

type Tab = 'positions' | 'orders' | 'trades' | 'account' | 'equity';

function fmt(n: number, dec = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPnL(n: number) {
  const s = n >= 0 ? '+' : '';
  return `${s}$${fmt(Math.abs(n))}`;
}
function pnlClass(n: number) {
  return n >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]';
}

export default function TradingDashboard() {
  const { account, positions, orders, trades, cancelOrder, closePosition, resetAccount, getStats } = useTrading();
  const [tab, setTab] = useState<Tab>('positions');

  const stats = useMemo(() => getStats(), [trades]);

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'positions', label: 'Positions', icon: <BarChart2 size={12} />, badge: positions.length },
    { id: 'orders', label: 'Orders', icon: <BookOpen size={12} />, badge: orders.filter(o => o.status === 'pending').length },
    { id: 'trades', label: 'Trade Log', icon: <TrendingUp size={12} />, badge: trades.length },
    { id: 'account', label: 'Account', icon: <Award size={12} /> },
    { id: 'equity', label: 'Equity', icon: <TrendingUp size={12} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      {/* P&L Summary strip */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-[#21262d] text-xs flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-[#8b949e]">Daily P&L</span>
          <span className={`font-mono font-bold ${pnlClass(account.dailyPnL)}`}>{fmtPnL(account.dailyPnL)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[#8b949e]">Total P&L</span>
          <span className={`font-mono font-bold ${pnlClass(account.totalPnL)}`}>{fmtPnL(account.totalPnL)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[#8b949e]">Balance</span>
          <span className="font-mono font-bold text-white">${fmt(account.balance, 0)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[#8b949e]">BP</span>
          <span className="font-mono text-[#79c0ff]">${fmt(account.buyingPower, 0)}</span>
        </div>
        <div className="flex-1" />
        <button onClick={resetAccount} title="Reset account" className="p-1 text-[#8b949e] hover:text-[#f85149] transition-colors">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#21262d] flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id
                ? 'border-[#1f6feb] text-white'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
            {(t.badge ?? 0) > 0 && (
              <span className="bg-[#1f6feb]/20 text-[#79c0ff] text-[10px] px-1 rounded-full">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'positions' && (
          <PositionsTab positions={positions} closePosition={closePosition} />
        )}
        {tab === 'orders' && (
          <OrdersTab orders={orders} cancelOrder={cancelOrder} />
        )}
        {tab === 'trades' && (
          <TradesTab trades={trades} />
        )}
        {tab === 'account' && (
          <AccountTab account={account} stats={stats} />
        )}
        {tab === 'equity' && (
          <EquityTab />
        )}
      </div>
    </div>
  );
}

function PositionsTab({ positions, closePosition }: {
  positions: import('../../types/trading').Position[];
  closePosition: (symbol: string, price: number) => void;
}) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#8b949e]">
        <Target size={24} className="mb-2 opacity-30" />
        <p className="text-xs">No open positions</p>
      </div>
    );
  }
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-[#161b22]">
        <tr className="text-[#8b949e] border-b border-[#21262d]">
          {['Symbol', 'Side', 'Qty', 'Avg', 'Last', 'P&L', 'P&L%', ''].map(h => (
            <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {positions.map(p => (
          <tr key={p.symbol} className="border-b border-[#21262d]/30 hover:bg-[#21262d]/30">
            <td className="px-2 py-1.5 font-semibold text-white font-mono">{p.symbol}</td>
            <td className={`px-2 py-1.5 font-semibold ${p.side === 'long' ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
              {p.side.toUpperCase()}
            </td>
            <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">{p.quantity}</td>
            <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">${p.avgCost.toFixed(2)}</td>
            <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">${p.currentPrice.toFixed(2)}</td>
            <td className={`px-2 py-1.5 font-mono font-semibold ${pnlClass(p.unrealizedPnL)}`}>
              {fmtPnL(p.unrealizedPnL)}
            </td>
            <td className={`px-2 py-1.5 font-mono ${pnlClass(p.unrealizedPnLPct)}`}>
              {p.unrealizedPnLPct >= 0 ? '+' : ''}{p.unrealizedPnLPct.toFixed(2)}%
            </td>
            <td className="px-2 py-1.5">
              <button
                onClick={() => closePosition(p.symbol, p.currentPrice)}
                className="text-[#8b949e] hover:text-[#f85149] transition-colors"
                title="Close position"
              >
                <Trash2 size={11} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrdersTab({ orders, cancelOrder }: {
  orders: import('../../types/trading').Order[];
  cancelOrder: (id: string) => void;
}) {
  const sorted = [...orders].sort((a, b) => b.timestamp - a.timestamp);
  if (sorted.length === 0) {
    return <div className="flex items-center justify-center h-32 text-[#8b949e] text-xs">No orders</div>;
  }
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-[#161b22]">
        <tr className="text-[#8b949e] border-b border-[#21262d]">
          {['Time', 'Symbol', 'Side', 'Type', 'Qty', 'Price', 'Status', ''].map(h => (
            <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map(o => (
          <tr key={o.id} className="border-b border-[#21262d]/30 hover:bg-[#21262d]/30">
            <td className="px-2 py-1.5 text-[#8b949e] font-mono">{new Date(o.timestamp).toLocaleTimeString()}</td>
            <td className="px-2 py-1.5 font-semibold text-white font-mono">{o.symbol}</td>
            <td className={`px-2 py-1.5 font-semibold ${o.side === 'buy' ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
              {o.side.toUpperCase()}
            </td>
            <td className="px-2 py-1.5 text-[#c9d1d9] capitalize">{o.type}</td>
            <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">{o.quantity}</td>
            <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">
              {o.fillPrice ? `$${o.fillPrice.toFixed(2)}` : o.limitPrice ? `$${o.limitPrice.toFixed(2)}` : 'MKT'}
            </td>
            <td className="px-2 py-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                o.status === 'filled' ? 'bg-[#3fb950]/20 text-[#3fb950]' :
                o.status === 'cancelled' ? 'bg-[#8b949e]/20 text-[#8b949e]' :
                o.status === 'rejected' ? 'bg-[#f85149]/20 text-[#f85149]' :
                'bg-[#d29922]/20 text-[#d29922]'
              }`}>{o.status}</span>
            </td>
            <td className="px-2 py-1.5">
              {o.status === 'pending' && (
                <button onClick={() => cancelOrder(o.id)} className="text-[#8b949e] hover:text-[#f85149]">
                  <Trash2 size={11} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TradesTab({ trades }: { trades: import('../../types/trading').Trade[] }) {
  const sorted = [...trades].sort((a, b) => b.timestamp - a.timestamp);
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  if (sorted.length === 0) {
    return <div className="flex items-center justify-center h-32 text-[#8b949e] text-xs">No trades yet</div>;
  }
  return (
    <div>
      <div className="px-3 py-2 bg-[#0d1117] flex items-center gap-4 text-xs sticky top-0">
        <span className="text-[#8b949e]">{trades.length} trades</span>
        <span className={`font-mono font-bold ${pnlClass(totalPnL)}`}>Total: {fmtPnL(totalPnL)}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#8b949e] border-b border-[#21262d]">
            {['Time', 'Symbol', 'Side', 'Qty', 'Entry', 'Exit', 'P&L', 'P&L%'].map(h => (
              <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(t => (
            <tr key={t.id} className="border-b border-[#21262d]/30 hover:bg-[#21262d]/30">
              <td className="px-2 py-1.5 text-[#8b949e] font-mono">{new Date(t.timestamp).toLocaleTimeString()}</td>
              <td className="px-2 py-1.5 font-semibold text-white font-mono">{t.symbol}</td>
              <td className={`px-2 py-1.5 font-semibold ${t.side === 'buy' ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                {t.side.toUpperCase()}
              </td>
              <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">{t.quantity}</td>
              <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">${t.entryPrice.toFixed(2)}</td>
              <td className="px-2 py-1.5 text-[#c9d1d9] font-mono">${t.exitPrice.toFixed(2)}</td>
              <td className={`px-2 py-1.5 font-mono font-semibold ${pnlClass(t.pnl)}`}>{fmtPnL(t.pnl)}</td>
              <td className={`px-2 py-1.5 font-mono ${pnlClass(t.pnlPct)}`}>
                {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountTab({ account, stats }: {
  account: import('../../types/trading').Account;
  stats: Pick<import('../../types/trading').Account, 'winRate' | 'avgWin' | 'avgLoss' | 'profitFactor' | 'streak' | 'maxDrawdown'> & { totalTrades: number; wins: number; losses: number };
}) {
  const metrics = [
    { label: 'Account Balance', value: `$${fmt(account.balance, 0)}`, highlight: true },
    { label: 'Buying Power', value: `$${fmt(account.buyingPower, 0)}`, color: '#79c0ff' },
    { label: 'Starting Balance', value: `$${fmt(account.startingBalance, 0)}` },
    { label: 'Cash Used', value: `$${fmt(account.cashUsed, 0)}` },
    { label: 'Daily P&L', value: fmtPnL(account.dailyPnL), pnl: account.dailyPnL },
    { label: 'Total P&L', value: fmtPnL(account.totalPnL), pnl: account.totalPnL },
    { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? '#3fb950' : '#f85149' },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), color: stats.profitFactor >= 1.5 ? '#3fb950' : '#f85149' },
    { label: 'Avg Win', value: fmtPnL(stats.avgWin), pnl: stats.avgWin },
    { label: 'Avg Loss', value: fmtPnL(stats.avgLoss), pnl: stats.avgLoss },
    { label: 'Total Trades', value: stats.totalTrades.toString() },
    { label: 'Winning Trades', value: stats.wins.toString(), color: '#3fb950' },
    { label: 'Losing Trades', value: stats.losses.toString(), color: '#f85149' },
    { label: 'Win Streak', value: `${stats.streak > 0 ? '+' : ''}${stats.streak}`, color: stats.streak > 0 ? '#3fb950' : stats.streak < 0 ? '#f85149' : undefined },
    { label: 'Max Drawdown', value: `$${fmt(Math.abs(account.maxDrawdown), 0)}`, color: '#f85149' },
    { label: 'Day Trades', value: account.dayTradeCount.toString() },
  ];

  return (
    <div className="p-3 grid grid-cols-2 gap-2">
      {metrics.map(m => (
        <div key={m.label} className="bg-[#0d1117] rounded-lg p-2.5">
          <div className="text-[#8b949e] text-[10px] mb-0.5">{m.label}</div>
          <div
            className={`font-mono font-bold text-sm ${m.highlight ? 'text-white' : ''}`}
            style={{ color: m.color || (m.pnl !== undefined ? (m.pnl >= 0 ? '#3fb950' : '#f85149') : undefined) || (m.highlight ? undefined : '#c9d1d9') }}
          >
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EquityTab() {
  const { equityHistory, account } = useTrading();

  if (equityHistory.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-[#8b949e]">
        <TrendingUp size={24} className="mb-2 opacity-30" />
        <p className="text-xs">Trade to see your equity curve</p>
      </div>
    );
  }

  const min = Math.min(...equityHistory.map(p => p.balance));
  const max = Math.max(...equityHistory.map(p => p.balance));
  const range = max - min || 1;
  const W = 400, H = 120;
  const pad = 8;

  const points = equityHistory.map((p, i) => {
    const x = pad + (i / (equityHistory.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((p.balance - min) / range) * (H - 2 * pad);
    return `${x},${y}`;
  });

  const isPositive = equityHistory[equityHistory.length - 1].balance >= equityHistory[0].balance;
  const color = isPositive ? '#3fb950' : '#f85149';
  const startBalance = equityHistory[0].balance;
  const endBalance = equityHistory[equityHistory.length - 1].balance;
  const pnl = endBalance - startBalance;

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-[#8b949e]">Equity Curve</span>
        <span className={`font-mono font-bold ${pnlClass(pnl)}`}>{fmtPnL(pnl)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
        <polyline
          points={`${pad},${H - pad} ${points.join(' ')} ${W - pad},${H - pad}`}
          fill={color}
          fillOpacity="0.1"
          stroke="none"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-[#8b949e] mt-1 font-mono">
        <span>${fmt(min, 0)}</span>
        <span>{equityHistory.length} trades</span>
        <span>${fmt(max, 0)}</span>
      </div>
    </div>
  );
}
