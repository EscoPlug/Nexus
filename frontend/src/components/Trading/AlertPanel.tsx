import { useState } from 'react';
import { Bell, BellOff, Plus, Trash2, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface Props {
  symbol: string;
  currentPrice: number;
}

export default function AlertPanel({ symbol, currentPrice }: Props) {
  const { alerts, addAlert, removeAlert } = useTrading();
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');

  const symbolAlerts = alerts.filter(a => a.symbol === symbol);
  const allAlerts = alerts;

  const handleAdd = () => {
    const p = parseFloat(price);
    if (!p || p <= 0) return;
    addAlert(symbol, condition, p, message || undefined);
    setPrice('');
    setMessage('');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-[#d29922]" />
          <span className="text-xs font-semibold text-[#c9d1d9]">Price Alerts</span>
        </div>
        <span className="text-[10px] text-[#8b949e]">{allAlerts.filter(a => !a.triggered).length} active</span>
      </div>

      {/* Add alert form */}
      <div className="p-3 border-b border-[#21262d] flex-shrink-0 space-y-2">
        <div className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">{symbol} — ${currentPrice.toFixed(2)}</div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setCondition('above')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
              condition === 'above' ? 'bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40' : 'bg-[#21262d] text-[#8b949e] border border-transparent hover:text-[#3fb950]'
            }`}
          >
            <TrendingUp size={11} />
            Above
          </button>
          <button
            onClick={() => setCondition('below')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
              condition === 'below' ? 'bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/40' : 'bg-[#21262d] text-[#8b949e] border border-transparent hover:text-[#f85149]'
            }`}
          >
            <TrendingDown size={11} />
            Below
          </button>
        </div>

        <div className="flex gap-1.5">
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Price"
            step="0.01"
            className="flex-1 bg-[#21262d] border border-[#30363d] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#1f6feb] font-mono"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!price}
            className="px-3 py-1.5 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded font-medium transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Note (optional)"
          maxLength={60}
          className="w-full bg-[#21262d] border border-[#30363d] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#1f6feb]"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {/* Current symbol alerts */}
        {symbolAlerts.length > 0 && (
          <div>
            <div className="px-3 pt-2 pb-1 text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">{symbol}</div>
            {symbolAlerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-2 px-3 py-2 border-b border-[#21262d] group ${alert.triggered ? 'opacity-60' : ''}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {alert.triggered
                    ? <CheckCircle2 size={13} className="text-[#3fb950]" />
                    : alert.condition === 'above'
                      ? <TrendingUp size={13} className="text-[#3fb950]" />
                      : <TrendingDown size={13} className="text-[#f85149]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-medium">{alert.condition === 'above' ? '≥' : '≤'} ${alert.price.toFixed(2)}</span>
                    {alert.triggered && (
                      <span className="text-[9px] bg-[#3fb950]/20 text-[#3fb950] px-1 rounded">TRIGGERED</span>
                    )}
                  </div>
                  {alert.message && <div className="text-[10px] text-[#8b949e] truncate">{alert.message}</div>}
                  {alert.triggered && alert.triggeredAt && (
                    <div className="text-[9px] text-[#8b949e]">{formatTime(alert.triggeredAt)}</div>
                  )}
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8b949e] hover:text-[#f85149] transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Other symbol alerts */}
        {allAlerts.filter(a => a.symbol !== symbol).length > 0 && (
          <div>
            <div className="px-3 pt-2 pb-1 text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">Other Symbols</div>
            {allAlerts.filter(a => a.symbol !== symbol).map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-2 px-3 py-2 border-b border-[#21262d] group ${alert.triggered ? 'opacity-60' : ''}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {alert.triggered
                    ? <CheckCircle2 size={13} className="text-[#3fb950]" />
                    : alert.condition === 'above'
                      ? <TrendingUp size={13} className="text-[#3fb950]" />
                      : <TrendingDown size={13} className="text-[#f85149]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#79c0ff]">{alert.symbol}</span>
                    <span className="text-xs font-mono">{alert.condition === 'above' ? '≥' : '≤'} ${alert.price.toFixed(2)}</span>
                    {alert.triggered && (
                      <span className="text-[9px] bg-[#3fb950]/20 text-[#3fb950] px-1 rounded">TRIGGERED</span>
                    )}
                  </div>
                  {alert.message && <div className="text-[10px] text-[#8b949e] truncate">{alert.message}</div>}
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8b949e] hover:text-[#f85149] transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {allAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-[#8b949e]">
            <BellOff size={20} className="mb-2 opacity-40" />
            <span className="text-xs">No alerts set</span>
          </div>
        )}
      </div>
    </div>
  );
}
