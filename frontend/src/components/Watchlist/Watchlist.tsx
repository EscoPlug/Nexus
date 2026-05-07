import { useState } from 'react';
import { Plus, X, Star, TrendingUp, TrendingDown } from 'lucide-react';
import type { WatchlistItem } from '../../types';

interface Props {
  items: WatchlistItem[];
  selected: string;
  livePrices: Record<string, { price: number; change: number; changePercent: number }>;
  onSelect: (symbol: string, name: string) => void;
  onAdd: (item: WatchlistItem) => void;
  onRemove: (symbol: string) => void;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
];

function fmt(n: number | undefined, dec = 2) {
  if (n === undefined || n === null) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return n.toFixed(dec);
}

export default function Watchlist({ items, selected, livePrices, onSelect, onAdd, onRemove }: Props) {
  const [addMode, setAddMode] = useState(false);
  const [addSymbol, setAddSymbol] = useState('');

  const handleAdd = () => {
    const sym = addSymbol.trim().toUpperCase();
    if (sym && !items.find(i => i.symbol === sym)) {
      onAdd({ symbol: sym, name: sym });
    }
    setAddSymbol('');
    setAddMode(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22] border-r border-[#21262d] w-48 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#21262d]">
        <div className="flex items-center gap-1.5">
          <Star size={12} className="text-[#d29922]" fill="currentColor" />
          <span className="text-[#c9d1d9] text-xs font-semibold uppercase tracking-wider">Watchlist</span>
        </div>
        <button
          onClick={() => setAddMode(!addMode)}
          className="text-[#8b949e] hover:text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Add symbol input */}
      {addMode && (
        <div className="px-2 py-2 border-b border-[#21262d]">
          <input
            autoFocus
            value={addSymbol}
            onChange={e => setAddSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAddMode(false); setAddSymbol(''); } }}
            placeholder="e.g. AAPL"
            className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-[#1f6feb]"
          />
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.map(item => {
          const live = livePrices[item.symbol];
          const price = live?.price ?? item.price;
          const changePercent = live?.changePercent ?? item.changePercent;
          const isUp = (changePercent ?? 0) >= 0;
          const isSelected = item.symbol === selected;

          return (
            <div
              key={item.symbol}
              onClick={() => onSelect(item.symbol, item.name)}
              className={`group flex items-center justify-between px-2.5 py-2 cursor-pointer transition-colors border-l-2 ${
                isSelected
                  ? 'bg-[#1f6feb]/10 border-l-[#1f6feb]'
                  : 'border-l-transparent hover:bg-[#21262d]/60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  {isUp ? (
                    <TrendingUp size={9} className="text-[#3fb950] flex-shrink-0" />
                  ) : (
                    <TrendingDown size={9} className="text-[#f85149] flex-shrink-0" />
                  )}
                  <span className={`font-semibold text-xs truncate ${isSelected ? 'text-[#79c0ff]' : 'text-[#c9d1d9]'}`}>
                    {item.symbol}
                  </span>
                </div>
                <div className="text-[#8b949e] text-[10px] truncate pl-3">{item.name}</div>
              </div>
              <div className="flex flex-col items-end ml-1">
                <span className="text-[#c9d1d9] text-xs font-mono">{price ? fmt(price) : '—'}</span>
                {changePercent !== undefined && (
                  <span className={`text-[10px] font-mono ${isUp ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                    {isUp ? '+' : ''}{changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onRemove(item.symbol); }}
                className="ml-1 opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-[#f85149] transition-all flex-shrink-0"
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Reset to defaults */}
      {items.length === 0 && (
        <div className="p-3 text-center">
          <p className="text-[#8b949e] text-xs mb-2">Watchlist is empty</p>
          <button
            onClick={() => DEFAULT_WATCHLIST.forEach(i => onAdd(i))}
            className="text-xs text-[#1f6feb] hover:text-[#79c0ff] transition-colors"
          >
            Load defaults
          </button>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_WATCHLIST };
