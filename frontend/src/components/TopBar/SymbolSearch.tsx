import { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { useSearch } from '../../hooks/useChartData';

interface Props {
  onSelect: (symbol: string, name: string) => void;
  onClose: () => void;
}

const POPULAR = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD' },
  { symbol: 'ETH-USD', name: 'Ethereum USD' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: '^GSPC', name: 'S&P 500 Index' },
  { symbol: 'GC=F', name: 'Gold Futures' },
];

export default function SymbolSearch({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSelect = (symbol: string, name: string) => {
    onSelect(symbol, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#161b22] border border-[#21262d] rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d]">
          <Search size={16} className="text-[#8b949e] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search symbol or company name..."
            className="flex-1 bg-transparent text-white text-sm placeholder-[#8b949e] focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && results.length > 0) handleSelect(results[0].symbol, results[0].name);
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#8b949e] hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query === '' ? (
            <div>
              <div className="px-4 py-2 text-xs text-[#8b949e] font-medium uppercase tracking-wider border-b border-[#21262d]/50">
                Popular
              </div>
              <div className="grid grid-cols-2 gap-0">
                {POPULAR.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => handleSelect(s.symbol, s.name)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#21262d] transition-colors text-left"
                  >
                    <TrendingUp size={12} className="text-[#8b949e] flex-shrink-0" />
                    <div>
                      <div className="text-white text-sm font-medium">{s.symbol}</div>
                      <div className="text-[#8b949e] text-xs truncate max-w-32">{s.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="px-4 py-8 text-center text-[#8b949e] text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#8b949e] text-sm">No results for "{query}"</div>
          ) : (
            <div>
              {results.map(r => (
                <button
                  key={r.symbol}
                  onClick={() => handleSelect(r.symbol, r.name)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#21262d] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-white text-sm font-medium">{r.symbol}</div>
                      <div className="text-[#8b949e] text-xs">{r.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8b949e] text-xs">{r.exchange}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      r.type === 'EQUITY' ? 'bg-[#1f6feb]/20 text-[#79c0ff]' :
                      r.type === 'ETF' ? 'bg-[#2ecc71]/20 text-[#3fb950]' :
                      r.type === 'CRYPTOCURRENCY' ? 'bg-[#d29922]/20 text-[#d29922]' :
                      'bg-[#21262d] text-[#8b949e]'
                    }`}>{r.type}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
