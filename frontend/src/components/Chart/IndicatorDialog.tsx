import { useState, useMemo } from 'react';
import { X, Search, Star, TrendingUp, BarChart2, Activity, Zap, Brain, Volume2, Settings, ChevronLeft, Trash2, Plus } from 'lucide-react';
import { INDICATOR_DEFS } from '../../indicators';
import type { ActiveIndicator, IndicatorCategory, IndicatorParam } from '../../types';

interface Props {
  activeIndicators: ActiveIndicator[];
  onAdd: (indicator: ActiveIndicator) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, params: Record<string, number | string | boolean>) => void;
  onClose: () => void;
}

// ── Per-param input ─────────────────────────────────────────────────────────
function ParamRow({ param, value, onChange }: {
  param: IndicatorParam;
  value: number | string | boolean;
  onChange: (v: number | string | boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#21262d]/60 last:border-0">
      <label className="text-[#c9d1d9] text-sm font-medium flex-1 min-w-0">{param.label}</label>
      {param.type === 'number' && (
        <input
          type="number"
          value={value as number}
          min={param.min}
          max={param.max}
          step={Number.isInteger(param.default) ? 1 : 0.01}
          onChange={e => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(n);
          }}
          className="w-24 bg-[#0d1117] border border-[#30363d] text-white text-sm rounded-lg px-3 py-1.5 text-right font-mono focus:outline-none focus:border-[#1f6feb] transition-colors"
        />
      )}
      {param.type === 'color' && (
        <div className="flex items-center gap-2">
          <label
            className="w-8 h-8 rounded-lg cursor-pointer border-2 border-[#30363d] hover:border-[#8b949e] transition-colors overflow-hidden flex-shrink-0"
            style={{ backgroundColor: value as string }}
          >
            <input
              type="color"
              value={value as string}
              onChange={e => onChange(e.target.value)}
              className="opacity-0 w-full h-full cursor-pointer"
            />
          </label>
          <span className="text-[#8b949e] text-xs font-mono">{(value as string).toUpperCase()}</span>
        </div>
      )}
      {param.type === 'select' && (
        <select
          value={value as string}
          onChange={e => onChange(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1f6feb] transition-colors"
        >
          {param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
      {param.type === 'boolean' && (
        <button
          onClick={() => onChange(!(value as boolean))}
          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#1f6feb]' : 'bg-[#30363d]'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      )}
    </div>
  );
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

export default function IndicatorDialog({ activeIndicators, onAdd, onRemove, onUpdate, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<IndicatorCategory | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingParams, setEditingParams] = useState<Record<string, number | string | boolean>>({});

  const categories: (IndicatorCategory | 'all')[] = ['all', 'overlay', 'momentum', 'volume', 'volatility', 'trend', 'advanced'];

  const filtered = useMemo(() => {
    return INDICATOR_DEFS.filter(def => {
      const matchCat = category === 'all' || def.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q || def.name.toLowerCase().includes(q) || def.shortName.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  // All active instances grouped by defId
  const activeByDef = useMemo(() => {
    const map: Record<string, ActiveIndicator[]> = {};
    for (const ind of activeIndicators) {
      if (!map[ind.defId]) map[ind.defId] = [];
      map[ind.defId].push(ind);
    }
    return map;
  }, [activeIndicators]);

  const openSettings = (ind: ActiveIndicator) => {
    setEditingParams({ ...ind.params });
    setEditingId(ind.id);
  };

  const handleParamChange = (key: string, value: number | string | boolean) => {
    const next = { ...editingParams, [key]: value };
    setEditingParams(next);
    if (editingId) onUpdate(editingId, next);
  };

  const addInstance = (defId: string) => {
    const def = INDICATOR_DEFS.find(d => d.id === defId)!;
    const params: Record<string, number | string | boolean> = {};
    def.params.forEach(p => { params[p.key] = p.default; });
    const newInd: ActiveIndicator = { id: `${defId}-${Date.now()}`, defId, params, visible: true };
    onAdd(newInd);
    // Open settings immediately so user can tweak before the chart draws it
    openSettings(newInd);
  };

  // ── Settings view ──────────────────────────────────────────────────────────
  if (editingId) {
    const activeInd = activeIndicators.find(a => a.id === editingId);
    const def = activeInd ? INDICATOR_DEFS.find(d => d.id === activeInd.defId) : null;

    if (!def || !activeInd) {
      setEditingId(null);
      return null;
    }

    // Build a label showing current key params (e.g. "20 · #3498db")
    const label = def.params
      .filter(p => p.type === 'number')
      .map(p => editingParams[p.key] ?? activeInd.params[p.key])
      .join(', ');

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ paddingTop: '60px' }}>
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-[#161b22] border border-[#21262d] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#21262d]">
            <button
              onClick={() => setEditingId(null)}
              className="p-1 text-[#8b949e] hover:text-white transition-colors rounded"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-semibold text-sm">{def.name}</h2>
                {label && <span className="text-[#8b949e] text-xs font-mono">({label})</span>}
              </div>
              <p className="text-[#8b949e] text-[11px]">{def.description}</p>
            </div>
            <button onClick={onClose} className="p-1 text-[#8b949e] hover:text-white transition-colors rounded">
              <X size={16} />
            </button>
          </div>

          {/* Param inputs */}
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {def.params.length === 0 && (
              <p className="text-[#8b949e] text-sm text-center py-8">No configurable parameters.</p>
            )}
            {def.params.map(param => (
              <ParamRow
                key={param.key}
                param={param}
                value={editingParams[param.key] ?? activeInd.params[param.key] ?? param.default}
                onChange={v => handleParamChange(param.key, v)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#21262d] px-5 py-3">
            <button
              onClick={() => { onRemove(editingId); setEditingId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[#f85149] hover:bg-[#f85149]/10 rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 size={13} />
              Remove
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="px-4 py-1.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main list view ─────────────────────────────────────────────────────────
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
                {defs.map(def => {
                  const instances = activeByDef[def.id] ?? [];
                  const isOn = instances.length > 0;
                  return (
                    <div
                      key={def.id}
                      className={`flex items-center px-3 py-2.5 rounded-lg transition-all ${
                        isOn
                          ? 'bg-[#1f6feb]/10 border border-[#1f6feb]/40'
                          : 'border border-transparent hover:bg-[#21262d]'
                      }`}
                    >
                      {/* Main row — clicking adds / opens first instance settings */}
                      <button
                        onClick={() => isOn ? openSettings(instances[0]) : addInstance(def.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOn ? 'bg-[#1f6feb]' : 'bg-[#8b949e]/30'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${isOn ? 'text-white' : 'text-[#c9d1d9]'}`}>{def.name}</span>
                            {def.isPremium && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#d29922]/20 text-[#d29922] text-[10px] font-medium rounded">
                                <Star size={8} fill="currentColor" /> PRO
                              </span>
                            )}
                          </div>
                          {/* Show active instance params */}
                          {isOn && (
                            <p className="text-[#8b949e] text-[11px] font-mono truncate">
                              {instances.map(inst => {
                                const nums = def.params.filter(p => p.type === 'number').map(p => inst.params[p.key]).join(', ');
                                return nums || 'click to edit';
                              }).join(' · ')}
                            </p>
                          )}
                          {!isOn && <p className="text-[#8b949e] text-xs truncate">{def.description}</p>}
                        </div>
                      </button>

                      {/* Right side controls */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {isOn && (
                          <>
                            <button
                              onClick={() => openSettings(instances[0])}
                              title="Edit settings"
                              className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded transition-colors"
                            >
                              <Settings size={13} />
                            </button>
                            <button
                              onClick={() => addInstance(def.id)}
                              title="Add another instance"
                              className="p-1.5 text-[#8b949e] hover:text-[#3fb950] hover:bg-[#21262d] rounded transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              onClick={() => onRemove(instances[instances.length - 1].id)}
                              title="Remove"
                              className="p-1.5 text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] rounded transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}
                        {!isOn && (
                          <span className={`text-xs font-mono ml-2 text-[#8b949e]`}>{def.shortName}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
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

        {/* Active indicators footer */}
        {activeIndicators.length > 0 && (
          <div className="border-t border-[#21262d] px-5 py-3">
            <p className="text-[#8b949e] text-xs mb-2">Active ({activeIndicators.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {activeIndicators.map(ind => {
                const def = INDICATOR_DEFS.find(d => d.id === ind.defId);
                const nums = def?.params.filter(p => p.type === 'number').map(p => ind.params[p.key]).join(', ');
                return (
                  <button
                    key={ind.id}
                    onClick={() => openSettings(ind)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#1f6feb]/20 hover:bg-[#1f6feb]/30 border border-[#1f6feb]/40 rounded-md text-xs text-[#79c0ff] transition-colors"
                  >
                    <Settings size={10} className="opacity-70" />
                    <span>{def?.shortName}{nums ? ` (${nums})` : ''}</span>
                    <button
                      onClick={e => { e.stopPropagation(); onRemove(ind.id); }}
                      className="text-[#8b949e] hover:text-white ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
