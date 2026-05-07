import { useState } from 'react';
import { Shield, Save, RotateCcw, AlertTriangle, TrendingDown, DollarSign, Hash } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export default function RiskManager() {
  const { riskSettings, updateRiskSettings, account } = useTrading();

  const [form, setForm] = useState({
    maxDailyLoss: riskSettings.maxDailyLoss.toString(),
    maxPositionSize: riskSettings.maxPositionSize.toString(),
    maxSharesPerTrade: riskSettings.maxSharesPerTrade.toString(),
    defaultShares: riskSettings.defaultShares.toString(),
    riskPerTrade: riskSettings.riskPerTrade.toString(),
    slippage: riskSettings.slippage.toString(),
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateRiskSettings({
      maxDailyLoss: parseFloat(form.maxDailyLoss) || riskSettings.maxDailyLoss,
      maxPositionSize: parseFloat(form.maxPositionSize) || riskSettings.maxPositionSize,
      maxSharesPerTrade: parseInt(form.maxSharesPerTrade) || riskSettings.maxSharesPerTrade,
      defaultShares: parseInt(form.defaultShares) || riskSettings.defaultShares,
      riskPerTrade: parseFloat(form.riskPerTrade) || riskSettings.riskPerTrade,
      slippage: parseFloat(form.slippage) || riskSettings.slippage,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setForm({
      maxDailyLoss: riskSettings.maxDailyLoss.toString(),
      maxPositionSize: riskSettings.maxPositionSize.toString(),
      maxSharesPerTrade: riskSettings.maxSharesPerTrade.toString(),
      defaultShares: riskSettings.defaultShares.toString(),
      riskPerTrade: riskSettings.riskPerTrade.toString(),
      slippage: riskSettings.slippage.toString(),
    });
  };

  const dailyLossUsedPct = riskSettings.maxDailyLoss > 0
    ? Math.min(100, Math.abs(Math.min(0, account.dailyPnL)) / riskSettings.maxDailyLoss * 100)
    : 0;

  const isAtDailyLimit = account.dailyPnL <= -riskSettings.maxDailyLoss;

  const Field = ({
    label, icon: Icon, value, onChange, suffix, step, min, placeholder, hint
  }: {
    label: string;
    icon: React.ElementType;
    value: string;
    onChange: (v: string) => void;
    suffix?: string;
    step?: string;
    min?: string;
    placeholder?: string;
    hint?: string;
  }) => (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">
        <Icon size={10} />
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          step={step ?? '1'}
          min={min ?? '0'}
          placeholder={placeholder}
          className="flex-1 bg-[#21262d] border border-[#30363d] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#1f6feb] font-mono text-right"
        />
        {suffix && <span className="text-[10px] text-[#8b949e] w-6">{suffix}</span>}
      </div>
      {hint && <div className="text-[9px] text-[#8b949e]">{hint}</div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-[#1f6feb]" />
          <span className="text-xs font-semibold">Risk Manager</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleReset} className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors">
            <RotateCcw size={12} />
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              saved ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#1f6feb] hover:bg-[#388bfd] text-white'
            }`}
          >
            <Save size={11} />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Daily loss limit status */}
        <div className={`rounded-lg p-3 border ${isAtDailyLimit ? 'bg-[#f85149]/10 border-[#f85149]/40' : 'bg-[#161b22] border-[#21262d]'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs">
              {isAtDailyLimit && <AlertTriangle size={12} className="text-[#f85149]" />}
              <span className={isAtDailyLimit ? 'text-[#f85149] font-semibold' : 'text-[#8b949e]'}>
                Daily Loss Limit
              </span>
            </div>
            <span className={`text-xs font-mono font-bold ${isAtDailyLimit ? 'text-[#f85149]' : dailyLossUsedPct > 75 ? 'text-[#d29922]' : 'text-[#c9d1d9]'}`}>
              ${Math.abs(Math.min(0, account.dailyPnL)).toFixed(0)} / ${riskSettings.maxDailyLoss.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isAtDailyLimit ? 'bg-[#f85149]' : dailyLossUsedPct > 75 ? 'bg-[#d29922]' : 'bg-[#3fb950]'
              }`}
              style={{ width: `${dailyLossUsedPct}%` }}
            />
          </div>
          <div className="text-[9px] text-[#8b949e] mt-1">{dailyLossUsedPct.toFixed(0)}% of daily limit used</div>
        </div>

        {/* Risk settings */}
        <div className="space-y-3">
          <div className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">Loss Limits</div>

          <Field
            label="Max Daily Loss"
            icon={TrendingDown}
            value={form.maxDailyLoss}
            onChange={v => setForm(f => ({ ...f, maxDailyLoss: v }))}
            suffix="$"
            step="100"
            hint="Trading halts when this loss is reached"
          />

          <Field
            label="Max Position Size"
            icon={DollarSign}
            value={form.maxPositionSize}
            onChange={v => setForm(f => ({ ...f, maxPositionSize: v }))}
            suffix="$"
            step="500"
            hint="Maximum dollar value per position"
          />
        </div>

        <div className="space-y-3">
          <div className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">Share Sizing</div>

          <Field
            label="Default Shares"
            icon={Hash}
            value={form.defaultShares}
            onChange={v => setForm(f => ({ ...f, defaultShares: v }))}
            hint="Pre-filled shares for each order"
          />

          <Field
            label="Max Shares per Trade"
            icon={Hash}
            value={form.maxSharesPerTrade}
            onChange={v => setForm(f => ({ ...f, maxSharesPerTrade: v }))}
            hint="Hard cap on shares in a single order"
          />
        </div>

        <div className="space-y-3">
          <div className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">Risk per Trade</div>

          <Field
            label="Risk % per Trade"
            icon={Shield}
            value={form.riskPerTrade}
            onChange={v => setForm(f => ({ ...f, riskPerTrade: v }))}
            suffix="%"
            step="0.1"
            hint="Used by the share size calculator"
          />

          <Field
            label="Slippage"
            icon={DollarSign}
            value={form.slippage}
            onChange={v => setForm(f => ({ ...f, slippage: v }))}
            suffix="$"
            step="0.01"
            hint="Per-share execution cost estimate"
          />
        </div>

        {/* Quick presets */}
        <div className="space-y-2">
          <div className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wide">Quick Presets</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Conservative', maxDailyLoss: 250, maxPositionSize: 2500, defaultShares: 100, riskPerTrade: 0.5 },
              { label: 'Moderate', maxDailyLoss: 500, maxPositionSize: 5000, defaultShares: 200, riskPerTrade: 1 },
              { label: 'Aggressive', maxDailyLoss: 1000, maxPositionSize: 10000, defaultShares: 500, riskPerTrade: 2 },
              { label: 'PDT Trader', maxDailyLoss: 2500, maxPositionSize: 25000, defaultShares: 1000, riskPerTrade: 2 },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => setForm(f => ({
                  ...f,
                  maxDailyLoss: preset.maxDailyLoss.toString(),
                  maxPositionSize: preset.maxPositionSize.toString(),
                  defaultShares: preset.defaultShares.toString(),
                  riskPerTrade: preset.riskPerTrade.toString(),
                }))}
                className="py-1.5 px-2 bg-[#161b22] border border-[#21262d] hover:border-[#1f6feb] text-[#8b949e] hover:text-white text-[10px] rounded transition-colors text-left"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
