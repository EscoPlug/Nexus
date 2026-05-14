import { useMemo } from 'react';
import DayMiniChart from './DayMiniChart';
import { useChartData } from '../../hooks/useChartData';
import type { OHLCVBar } from '../../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayGroup {
  key: string;
  dayName: string;
  date: string;
  bars: OHLCVBar[];
  isToday: boolean;
}

interface Props {
  symbol: string;
  symbolName: string;
}

export default function WeekView({ symbol, symbolName }: Props) {
  const { bars, loading } = useChartData(symbol, '1h');

  const days = useMemo<DayGroup[]>(() => {
    const todayStr = new Date().toDateString();
    const map = new Map<string, OHLCVBar[]>();

    for (const bar of bars) {
      const d = new Date(bar.time * 1000);
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bar);
    }

    return Array.from(map.entries())
      .slice(-5)
      .map(([key, dayBars]) => {
        const d = new Date(dayBars[0].time * 1000);
        return {
          key,
          dayName: DAY_NAMES[d.getDay()],
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          bars: dayBars,
          isToday: key === todayStr,
        };
      });
  }, [bars]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border-b border-[#21262d] flex-shrink-0">
        <span className="text-white font-semibold text-sm">{symbol}</span>
        <span className="text-[#8b949e] text-xs">{symbolName}</span>
        <span className="text-[#484f58] text-xs">·</span>
        <span className="text-[#8b949e] text-xs">Week · 1h bars</span>
        {loading && bars.length === 0 && (
          <div className="w-3 h-3 border border-[#1f6feb] border-t-transparent rounded-full animate-spin ml-1" />
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && days.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-[#1f6feb] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : days.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#484f58] text-sm">
            No weekly data available for {symbol}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3" style={{ gridAutoRows: '220px' }}>
            {days.map(({ key, dayName, date, bars: dayBars, isToday }) => (
              <DayMiniChart
                key={key}
                bars={dayBars}
                dayName={dayName}
                date={date}
                isToday={isToday}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
