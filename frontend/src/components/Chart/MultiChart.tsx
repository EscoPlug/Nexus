import { useState } from 'react';
import MiniChart from './MiniChart';
import type { Timeframe } from '../../types';

const DEFAULT_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'GOOGL', name: 'Alphabet' },
];

interface Props {
  timeframe: Timeframe;
  onSelectSymbol: (symbol: string, name: string) => void;
}

export default function MultiChart({ timeframe, onSelectSymbol }: Props) {
  const [symbols] = useState(DEFAULT_SYMBOLS);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 bg-[#0d1117]">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4" style={{ gridAutoRows: '140px' }}>
        {symbols.map(({ symbol, name }) => (
          <MiniChart
            key={symbol}
            symbol={symbol}
            name={name}
            timeframe={timeframe}
            onClick={() => onSelectSymbol(symbol, name)}
          />
        ))}
      </div>
    </div>
  );
}
