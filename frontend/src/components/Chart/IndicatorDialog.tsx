import { useState, useMemo } from 'react';
import { X, Search, Star, TrendingUp, BarChart2, Activity, Zap, Brain, Volume2 } from 'lucide-react';
import { INDICATOR_DEFS } from '../../indicators';
import type { ActiveIndicator, IndicatorCategory } from '../../types';

interface Props {
  activeIndicators: ActiveIndicator[];
  onAdd: (indicator: ActiveIndicator) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<IndicatorCategory, React.ReactNode> = {
  overlay: <TrendingUp size={14} />,
  momentum: <Activity size={14} />,
  volume: <Volume2 size={14} />,
  volatility: <Zap size={14} />,
  trend: <BarChart2 size={14} />,
  advanced: <Brain size={14} />,
};

const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  overlay: 'Moving Averages & Overlays',
  momentum: 'Momentum',
  volume: 'Volume',
  volatility: 'Volatility',
  trend: 'Trend',
  advanced: 'Advanced / Premium',
};

export default function IndicatorDialog({ activeIndicators, onAdd, onRemove, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<IndicatorCategory | 'all'>('all');
  const categories: (IndicatorCategory | 'all')[] = ['all', 'overlay', 'momentum', 'volume', 'volatility', 'trend', 'advanced'];

  const filtered = useMemo(() => {
    return INDICATOR_DEFS.filter(def => {
      const matchCat = category === 'all' || def.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q || def.name.toLowerCase().includes(q) || def.shortName.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const isActive = (defId: string) => activeIndicators.some(a => a.defId === defId);

  const handleToggle = (defId: string) => {
    const existing = activeIndicators.find(a => a.defId === defId);
    if (existing) {
      onRemove(existing.id);
    } else {
      const def = INDICATOR_DEFS.find(d => d.id === defId)!;
      const params: Record<string, number | string | boolean> = {};
      def.params.forEach(p => { params[p.key] = p.default; });
      onAdd({
        id: `${defId}-${Date.now()}`,
        defId,
        params,
        visible: true,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ paddingTop: '60px' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#161b22] border border-[#21262d] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <h2 className="text-white font-semibold text-base">Indicators</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[#21262d]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search indicators..."
              className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#8b949e] focus:outline-none focus:border-[#1f6feb] transition-colors"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-5 py-2 border-b border-[#21262d] flex gap-1 overflow-x-auto scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-[#1f6feb] text-white'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              {cat !== 'all' && CATEGORY_ICONS[cat as IndicatorCategory]}
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Indicator list */}
        <div className="flex-1 overflow-y-auto p-3">
          {Object.entries(
            filtered.reduce((acc, def) => {
              const cat = def.category;
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(def);
              return acc;
            }, {} as Record<string, typeof filtered>)
          ).map(([cat, defs]) => (
            <div key={cat} className="mb-4">
              <div className="flex items-center gap-2 text-[#8b949e] text-xs font-medium uppercase tracking-wider mb-2 px-2">
                {CATEGORY_ICONS[cat as IndicatorCategory]}
                <span>{CATEGORY_LABELS[cat as IndicatorCategory]}</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {defs.map(def => (
                  <button
                    key={def.id}
                    onClick={() => handleToggle(def.id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive(def.id)
                        ? 'bg-[#1f6feb]/20 border border-[#1f6feb]/50 text-white'
                        : 'text-[#c9d1d9] hover:bg-[#21262d] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive(def.id) ? 'bg-[#1f6feb]' : 'bg-[#8b949e]/30'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{def.name}</span>
                          {def.isPremium && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#d29922]/20 text-[#d29922] text-[10px] font-medium rounded">
                              <Star size={8} fill="currentColor" /> PRO
                            </span>
                          )}
                        </div>
                        <p className="text-[#8b949e] text-xs truncate">{def.description}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-mono ml-2 flex-shrink-0 ${isActive(def.id) ? 'text-[#1f6feb]' : 'text-[#8b949e]'}`}>
                      {def.shortName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-[#8b949e] py-12">
              <Activity size={32} className="mx-auto mb-3 opacity-30" />
              <p>No indicators found</p>
            </div>
          )}
        </div>

        {/* Active indicators */}
        {activeIndicators.length > 0 && (
          <div className="border-t border-[#21262d] px-5 py-3">
            <p className="text-[#8b949e] text-xs mb-2">Active ({activeIndicators.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {activeIndicators.map(ind => {
                const def = INDICATOR_DEFS.find(d => d.id === ind.defId);
                return (
                  <span
                    key={ind.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#1f6feb]/20 border border-[#1f6feb]/40 rounded-md text-xs text-[#79c0ff]"
                  >
                    {def?.shortName}
                    <button
                      onClick={() => onRemove(ind.id)}
                      className="text-[#8b949e] hover:text-white ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
