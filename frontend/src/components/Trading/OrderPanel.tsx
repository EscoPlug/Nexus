import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, TrendingDown, AlertTriangle, Zap, Calculator, X, Wifi } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { submitAlpacaOrder } from '../../api/broker';
import type { OrderType, OrderSide } from '../../types/trading';

interface Props {
  symbol: string;
  currentPrice: number;
}

export default function OrderPanel({ symbol, currentPrice }: Props) {
  const { account, positions, riskSettings, placeOrder, closePosition, brokerMode } = useTrading();
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [shares, setShares] = useState(riskSettings.defaultShares.toString());
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastFill, setLastFill] = useState<{ side: string; shares: number; price: number } | null>(null);
  const [alpacaError, setAlpacaError] = useState<string | null>(null);

  const isAlpaca = brokerMode !== 'sim';
  const isPaper = brokerMode === 'alpaca-paper';

  const openPosition = positions.find(p => p.symbol === symbol);
  const sharesNum = parseInt(shares) || 0;
  const effectivePrice = orderType === 'market' ? currentPrice : parseFloat(limitPrice) || currentPrice;
  const tradeValue = sharesNum * effectivePrice;
  const dollarRisk = stopPrice ? Math.abs(effectivePrice - parseFloat(stopPrice)) * sharesNum : 0;
  const pctRisk = account.balance > 0 ? (dollarRisk / account.balance) * 100 : 0;

  // Risk-based share calculator
  const calcSharesFromRisk = useCallback(() => {
    if (!stopPrice || !currentPrice) return;
    const riskAmount = account.balance * (riskSettings.riskPerTrade / 100);
    const perShareRisk = Math.abs(currentPrice - parseFloat(stopPrice));
    if (perShareRisk > 0) {
      setShares(Math.floor(riskAmount / perShareRisk).toString());
    }
  }, [account.balance, currentPrice, stopPrice, riskSettings.riskPerTrade]);

  const handleExecute = useCallback(async () => {
    if (sharesNum <= 0) return;
    setShowConfirm(false);
    setAlpacaError(null);

    if (isAlpaca) {
      try {
        const lp = parseFloat(limitPrice) || undefined;
        const sp = parseFloat(stopPrice) || undefined;
        const filled = await submitAlpacaOrder({
          symbol,
          qty: sharesNum,
          side,
          type: orderType,
          limit_price: lp,
          stop_price: sp,
          paper: isPaper,
        });
        if (filled.filled_avg_price) {
          setLastFill({ side, shares: sharesNum, price: parseFloat(filled.filled_avg_price) });
          setTimeout(() => setLastFill(null), 4000);
        } else {
          setLastFill({ side, shares: sharesNum, price: currentPrice });
          setTimeout(() => setLastFill(null), 4000);
        }
      } catch (err: unknown) {
        setAlpacaError(err instanceof Error ? err.message : 'Order failed');
        setTimeout(() => setAlpacaError(null), 5000);
      }
    } else {
      const lp = parseFloat(limitPrice) || undefined;
      const sp = parseFloat(stopPrice) || undefined;
      const order = placeOrder(symbol, side, orderType, sharesNum, currentPrice, lp, sp);
      if (order.status === 'filled' && order.fillPrice) {
        setLastFill({ side, shares: sharesNum, price: order.fillPrice });
        setTimeout(() => setLastFill(null), 3000);
      }
    }
  }, [symbol, side, orderType, sharesNum, limitPrice, stopPrice, currentPrice, placeOrder, isAlpaca, isPaper]);

  // Hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') { setSide('buy'); setShowConfirm(true); }
      if (e.key === 's' || e.key === 'S') { setSide('sell'); setShowConfirm(true); }
      if (e.key === 'Escape') setShowConfirm(false);
      if (e.key === 'Enter' && showConfirm) handleExecute();
      if (e.key === 'F1') { e.preventDefault(); setSide('buy'); setOrderType('market'); }
      if (e.key === 'F2') { e.preventDefault(); setSide('sell'); setOrderType('market'); }
      if (e.key === 'F3') { e.preventDefault(); openPosition && closePosition(symbol, currentPrice); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfirm, handleExecute, openPosition, closePosition, symbol, currentPrice]);

  const canTrade = (isAlpaca || tradeValue <= account.buyingPower) && sharesNum > 0;
  const isOverRisk = pctRisk > 2;

  return (
    <div className="bg-[#161b22] border-t border-[#21262d] p-3 flex-shrink-0">
      {/* Broker mode badge */}
      {isAlpaca && (
        <div className={`mb-2 px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1.5 ${
          isPaper ? 'bg-[#1f6feb]/15 text-[#79c0ff]' : 'bg-[#f85149]/15 text-[#f85149]'
        }`}>
          <Wifi size={10} />
          {isPaper ? 'Alpaca Paper' : 'Alpaca Live'} — orders sent to real broker
        </div>
      )}

      {/* Fill notification */}
      {lastFill && (
        <div className={`mb-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${lastFill.side === 'buy' ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#f85149]/20 text-[#f85149]'}`}>
          <Zap size={12} />
          {isAlpaca ? 'Submitted' : 'Filled'}: {lastFill.side.toUpperCase()} {lastFill.shares} {symbol} @ ${lastFill.price.toFixed(2)}
        </div>
      )}

      {/* Alpaca error */}
      {alpacaError && (
        <div className="mb-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 bg-[#f85149]/20 text-[#f85149]">
          <AlertTriangle size={12} />
          {alpacaError}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {/* Buy / Sell */}
        <div className="flex rounded-lg overflow-hidden border border-[#21262d]">
          <button
            onClick={() => setSide('buy')}
            className={`px-4 py-1.5 text-sm font-semibold transition-colors ${side === 'buy' ? 'bg-[#3fb950] text-black' : 'text-[#8b949e] hover:text-[#3fb950]'}`}
          >
            BUY
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`px-4 py-1.5 text-sm font-semibold transition-colors ${side === 'sell' ? 'bg-[#f85149] text-white' : 'text-[#8b949e] hover:text-[#f85149]'}`}
          >
            SELL
          </button>
        </div>

        {/* Symbol display */}
        <div className="font-mono font-bold text-white text-sm px-2 py-1.5 bg-[#21262d] rounded-lg min-w-16 text-center">
          {symbol}
        </div>

        {/* Order type */}
        <select
          value={orderType}
          onChange={e => setOrderType(e.target.value as OrderType)}
          className="bg-[#21262d] border border-[#30363d] text-[#c9d1d9] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1f6feb]"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
          <option value="stop-limit">Stop-Limit</option>
        </select>

        {/* Shares */}
        <div className="flex items-center gap-1">
          <label className="text-[#8b949e] text-xs">Shares</label>
          <input
            type="number"
            value={shares}
            onChange={e => setShares(e.target.value)}
            min="1"
            step="100"
            className="w-20 bg-[#21262d] border border-[#30363d] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1f6feb] text-right font-mono"
          />
        </div>

        {/* Limit price */}
        {(orderType === 'limit' || orderType === 'stop-limit') && (
          <div className="flex items-center gap-1">
            <label className="text-[#8b949e] text-xs">Limit</label>
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={currentPrice.toFixed(2)}
              step="0.01"
              className="w-24 bg-[#21262d] border border-[#30363d] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1f6feb] text-right font-mono"
            />
          </div>
        )}

        {/* Stop price */}
        {(orderType === 'stop' || orderType === 'stop-limit') && (
          <div className="flex items-center gap-1">
            <label className="text-[#8b949e] text-xs">Stop</label>
            <input
              type="number"
              value={stopPrice}
              onChange={e => setStopPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-24 bg-[#21262d] border border-[#30363d] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1f6feb] text-right font-mono"
            />
          </div>
        )}

        {/* Risk calculator button */}
        {stopPrice && (
          <button onClick={calcSharesFromRisk} title="Calculate shares from risk %" className="p-1.5 text-[#8b949e] hover:text-[#d29922] hover:bg-[#21262d] rounded transition-colors">
            <Calculator size={14} />
          </button>
        )}

        <div className="flex-1" />

        {/* Trade value & risk metrics */}
        <div className="flex items-center gap-3 text-xs text-[#8b949e] font-mono">
          <span>Value: <span className="text-[#c9d1d9]">${tradeValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></span>
          {dollarRisk > 0 && (
            <span className={isOverRisk ? 'text-[#f85149]' : 'text-[#c9d1d9]'}>
              {isOverRisk && <AlertTriangle size={10} className="inline mr-0.5" />}
              Risk: ${dollarRisk.toFixed(0)} ({pctRisk.toFixed(1)}%)
            </span>
          )}
          <span className={account.buyingPower < tradeValue ? 'text-[#f85149]' : 'text-[#8b949e]'}>
            BP: ${account.buyingPower.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Position info */}
        {openPosition && (
          <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono ${openPosition.unrealizedPnL >= 0 ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#f85149]/10 text-[#f85149]'}`}>
            <span>{openPosition.quantity} shares @ ${openPosition.avgCost.toFixed(2)}</span>
            <span>{openPosition.unrealizedPnL >= 0 ? '+' : ''}${openPosition.unrealizedPnL.toFixed(2)}</span>
            <button onClick={() => closePosition(symbol, currentPrice)} className="ml-1 hover:text-white" title="Close position (F3)">
              <X size={10} />
            </button>
          </div>
        )}

        {/* Execute button */}
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canTrade}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              side === 'buy'
                ? 'bg-[#3fb950] hover:bg-[#3fb950]/90 text-black'
                : 'bg-[#f85149] hover:bg-[#f85149]/90 text-white'
            }`}
          >
            {side === 'buy' ? <ShoppingCart size={14} className="inline mr-1" /> : <TrendingDown size={14} className="inline mr-1" />}
            {side === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b949e]">Confirm {side.toUpperCase()} {sharesNum} @ ${effectivePrice.toFixed(2)}?</span>
            <button onClick={handleExecute} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${side === 'buy' ? 'bg-[#3fb950] text-black' : 'bg-[#f85149] text-white'}`}>
              Confirm [Enter]
            </button>
            <button onClick={() => setShowConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#21262d] text-[#8b949e] hover:text-white">
              Cancel [Esc]
            </button>
          </div>
        )}
      </div>

      {/* Hotkey bar */}
      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#8b949e]">
        <span className="bg-[#21262d] px-1.5 py-0.5 rounded">F1</span><span>Market Buy</span>
        <span className="bg-[#21262d] px-1.5 py-0.5 rounded">F2</span><span>Market Sell</span>
        <span className="bg-[#21262d] px-1.5 py-0.5 rounded">F3</span><span>Close Position</span>
        <span className="bg-[#21262d] px-1.5 py-0.5 rounded">B</span><span>Quick Buy</span>
        <span className="bg-[#21262d] px-1.5 py-0.5 rounded">S</span><span>Quick Sell</span>
        <span className="bg-[#21262d] px-1.5 py-0.5 rounded">Esc</span><span>Cancel</span>
      </div>
    </div>
  );
}
