import { useMarkets } from '../../hooks/useChartData';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MarketTicker() {
  const markets = useMarkets();

  if (markets.length === 0) return null;

  return (
    <div className="flex items-center h-7 bg-[#0d1117] border-b border-[#21262d] overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-0 animate-none overflow-x-auto scrollbar-none px-2 gap-4">
        {markets.map(m => {
          const isUp = m.changePercent >= 0;
          return (
            <div key={m.symbol} className="flex items-center gap-1.5 flex-shrink-0 px-2">
              <span className="text-[#8b949e] text-[10px] font-medium">{m.name || m.symbol}</span>
              <span className="text-white text-[10px] font-mono">
                {m.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center gap-0.5 text-[10px] font-mono ${isUp ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                {isUp ? '+' : ''}{m.changePercent?.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
