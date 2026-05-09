import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  Account,
  Alert,
  EquityPoint,
  Order,
  OrderSide,
  OrderType,
  Position,
  RiskSettings,
  Trade,
} from '../types/trading';

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexus-trading-state';
const STARTING_BALANCE = 25_000;
const MARGIN_MULTIPLIER = 2;

// ─── Pure helpers ────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function calcBuyingPower(balance: number, cashUsed: number): number {
  return (balance - cashUsed) * MARGIN_MULTIPLIER;
}

function calcUnrealizedPnL(
  side: 'long' | 'short',
  avgCost: number,
  quantity: number,
  currentPrice: number,
): number {
  return side === 'long'
    ? (currentPrice - avgCost) * quantity
    : (avgCost - currentPrice) * quantity;
}

function calcUnrealizedPnLPct(
  avgCost: number,
  unrealizedPnL: number,
  quantity: number,
): number {
  const cost = avgCost * quantity;
  return cost === 0 ? 0 : unrealizedPnL / cost;
}

/** Returns the local-midnight unix-ms for a given timestamp. */
function midnightOf(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Derive performance metrics from a completed trade list.
 * streak: positive = consecutive wins, negative = consecutive losses.
 */
interface DerivedStats
  extends Pick<Account, 'winRate' | 'avgWin' | 'avgLoss' | 'profitFactor' | 'streak'> {
  totalTrades: number;
  wins: number;
  losses: number;
}

function deriveStats(trades: Trade[]): DerivedStats {
  if (trades.length === 0) {
    return {
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      streak: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
    };
  }

  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (const t of trades) {
    if (t.pnl > 0) {
      wins++;
      grossProfit += t.pnl;
    } else {
      grossLoss += Math.abs(t.pnl);
    }
  }

  // Walk backward from the most recent trade to determine current streak.
  const lastSign = trades[trades.length - 1].pnl >= 0 ? 1 : -1;
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const sign = trades[i].pnl >= 0 ? 1 : -1;
    if (sign !== lastSign) break;
    streak += sign;
  }

  const losses = trades.length - wins;
  return {
    winRate: wins / trades.length,
    avgWin: wins > 0 ? grossProfit / wins : 0,
    avgLoss: losses > 0 ? grossLoss / losses : 0,
    profitFactor:
      grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss,
    streak,
    totalTrades: trades.length,
    wins,
    losses,
  };
}

/** Compute maximum peak-to-trough drawdown (in dollars) from equity history. */
function calcMaxDrawdown(history: EquityPoint[]): number {
  let peak = -Infinity;
  let maxDD = 0;
  for (const pt of history) {
    if (pt.balance > peak) peak = pt.balance;
    const dd = peak - pt.balance;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function buildInitialAccount(): Account {
  return {
    balance: STARTING_BALANCE,
    startingBalance: STARTING_BALANCE,
    buyingPower: STARTING_BALANCE * MARGIN_MULTIPLIER,
    cashUsed: 0,
    dailyPnL: 0,
    totalPnL: 0,
    dayTradeCount: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    streak: 0,
  };
}

function buildDefaultRiskSettings(): RiskSettings {
  return {
    maxDailyLoss: 1_000,
    maxPositionSize: 10_000,
    maxSharesPerTrade: 1_000,
    defaultShares: 100,
    riskPerTrade: 250,
    slippage: 0.001,
  };
}

// ─── Persisted state shape ────────────────────────────────────────────────────

export type BrokerMode = 'sim' | 'alpaca-paper' | 'alpaca-live';

interface PersistedState {
  account: Account;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  alerts: Alert[];
  riskSettings: RiskSettings;
  equityHistory: EquityPoint[];
  /** Local-midnight timestamp for the session that last wrote dailyPnL. */
  dailyPnLDate: number;
  brokerMode?: BrokerMode;
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function buildInitialState(): PersistedState {
  const account = buildInitialAccount();
  const now = Date.now();
  return {
    account,
    positions: [],
    orders: [],
    trades: [],
    alerts: [],
    riskSettings: buildDefaultRiskSettings(),
    equityHistory: [{ timestamp: now, balance: account.balance, dailyPnL: 0 }],
    dailyPnLDate: midnightOf(now),
  };
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface TradingContextValue {
  account: Account;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  alerts: Alert[];
  riskSettings: RiskSettings;
  equityHistory: EquityPoint[];

  /**
   * Place an order. Market orders are filled immediately with slippage applied.
   * Limit / stop / stop-limit orders are queued as 'pending'.
   * Returns the resulting Order object.
   */
  placeOrder: (
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    currentPrice: number,
    limitPrice?: number,
    stopPrice?: number,
  ) => Order;
  cancelOrder: (orderId: string) => void;
  /** Close the full position at market price. */
  closePosition: (symbol: string, currentPrice: number) => void;
  closePartialPosition: (symbol: string, quantity: number, currentPrice: number) => void;
  addAlert: (
    symbol: string,
    condition: 'above' | 'below',
    price: number,
    message?: string,
  ) => void;
  removeAlert: (id: string) => void;
  /** Refresh unrealised P&L for all positions that appear in priceMap. */
  updatePositionPrices: (priceMap: Record<string, number>) => void;
  /** Mark alerts whose condition is now met and return the newly-triggered ones. */
  checkAlerts: (priceMap: Record<string, number>) => Alert[];
  updateRiskSettings: (settings: Partial<RiskSettings>) => void;
  resetAccount: () => void;
  getStats: () => Pick<
    Account,
    'winRate' | 'avgWin' | 'avgLoss' | 'profitFactor' | 'streak' | 'maxDrawdown'
  > & { totalTrades: number; wins: number; losses: number };
  brokerMode: BrokerMode;
  setBrokerMode: (mode: BrokerMode) => void;
}

const TradingContext = createContext<TradingContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const saved = loadState();
  const init = saved ?? buildInitialState();

  const [account, setAccount] = useState<Account>(init.account);
  const [positions, setPositions] = useState<Position[]>(init.positions);
  const [orders, setOrders] = useState<Order[]>(init.orders);
  const [trades, setTrades] = useState<Trade[]>(init.trades);
  const [alerts, setAlerts] = useState<Alert[]>(init.alerts);
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(init.riskSettings);
  const [equityHistory, setEquityHistory] = useState<EquityPoint[]>(init.equityHistory);
  const [brokerMode, setBrokerModeState] = useState<BrokerMode>(init.brokerMode ?? 'sim');

  const setBrokerMode = useCallback((mode: BrokerMode) => {
    setBrokerModeState(mode);
  }, []);

  /** Tracks which calendar day the current dailyPnL belongs to. */
  const dailyPnLDateRef = useRef<number>(init.dailyPnLDate);

  // ── Midnight reset ────────────────────────────────────────────────────────
  useEffect(() => {
    function checkMidnight() {
      const todayMidnight = midnightOf(Date.now());
      if (todayMidnight > dailyPnLDateRef.current) {
        dailyPnLDateRef.current = todayMidnight;
        setAccount((prev) => ({ ...prev, dailyPnL: 0 }));
      }
    }
    checkMidnight();
    const interval = setInterval(checkMidnight, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => {
    const state: PersistedState = {
      account,
      positions,
      orders,
      trades,
      alerts,
      riskSettings,
      equityHistory,
      dailyPnLDate: dailyPnLDateRef.current,
      brokerMode,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota exceeded — silently ignore.
    }
  }, [account, positions, orders, trades, alerts, riskSettings, equityHistory, brokerMode]);

  // ── Internal: record a completed trade and update account/equity ──────────
  /**
   * Called synchronously after a position is reduced or closed.
   * Updates trades, account (balance, cashUsed, stats), and equity history.
   *
   * @param trade      The completed trade record.
   * @param costBasis  The cash tied up in the closed portion (avgCost * qty).
   */
  const recordTrade = useCallback(
    (trade: Trade, costBasis: number) => {
      setTrades((prevTrades) => {
        const nextTrades = [...prevTrades, trade];
        const stats = deriveStats(nextTrades);

        setAccount((prevAcc) => {
          const newBalance = prevAcc.balance + trade.pnl;
          const newCashUsed = Math.max(0, prevAcc.cashUsed - costBasis);
          const newDailyPnL = prevAcc.dailyPnL + trade.pnl;
          const newTotalPnL = prevAcc.totalPnL + trade.pnl;

          const equityPoint: EquityPoint = {
            timestamp: trade.exitTime,
            balance: newBalance,
            dailyPnL: newDailyPnL,
          };

          setEquityHistory((prevHist) => {
            const nextHist = [...prevHist, equityPoint];
            const maxDD = calcMaxDrawdown(nextHist);
            // Update maxDrawdown in account after we have the new history.
            setAccount((acc) => ({ ...acc, maxDrawdown: maxDD }));
            return nextHist;
          });

          return {
            ...prevAcc,
            balance: newBalance,
            cashUsed: newCashUsed,
            buyingPower: calcBuyingPower(newBalance, newCashUsed),
            dailyPnL: newDailyPnL,
            totalPnL: newTotalPnL,
            ...stats,
          };
        });

        return nextTrades;
      });
    },
    [],
  );

  // ── placeOrder ────────────────────────────────────────────────────────────
  const placeOrder = useCallback(
    (
      symbol: string,
      side: OrderSide,
      type: OrderType,
      quantity: number,
      currentPrice: number,
      limitPrice?: number,
      stopPrice?: number,
    ): Order => {
      const now = Date.now();
      const baseOrder: Order = {
        id: generateId(),
        symbol,
        side,
        type,
        quantity,
        limitPrice,
        stopPrice,
        status: 'pending',
        timestamp: now,
      };

      // Non-market orders are queued and require external trigger to fill.
      if (type !== 'market') {
        setOrders((prev) => [...prev, baseOrder]);
        return baseOrder;
      }

      // ── Market order: fill immediately ──────────────────────────────────
      const slip = riskSettings.slippage;
      const fillPrice = currentPrice * (1 + slip * (side === 'buy' ? 1 : -1));

      const filled: Order = { ...baseOrder, status: 'filled', fillPrice };
      setOrders((prev) => [...prev, filled]);

      // Determine what happens to the position book.
      setPositions((prevPositions) => {
        const idx = prevPositions.findIndex((p) => p.symbol === symbol);

        // ── No existing position: open a new one ────────────────────────
        if (idx === -1) {
          const newPos: Position = {
            symbol,
            quantity,
            avgCost: fillPrice,
            side: side === 'buy' ? 'long' : 'short',
            currentPrice: fillPrice,
            unrealizedPnL: 0,
            unrealizedPnLPct: 0,
            marketValue: fillPrice * quantity,
            openTime: now,
          };
          setAccount((acc) => {
            const newCashUsed = acc.cashUsed + fillPrice * quantity;
            return {
              ...acc,
              cashUsed: newCashUsed,
              buyingPower: calcBuyingPower(acc.balance, newCashUsed),
            };
          });
          return [...prevPositions, newPos];
        }

        const pos = prevPositions[idx];
        const isSameDirection =
          (pos.side === 'long' && side === 'buy') ||
          (pos.side === 'short' && side === 'sell');

        // ── Same direction: scale into the position ──────────────────────
        if (isSameDirection) {
          const totalQty = pos.quantity + quantity;
          const newAvgCost =
            (pos.avgCost * pos.quantity + fillPrice * quantity) / totalQty;
          const unrealizedPnL = calcUnrealizedPnL(pos.side, newAvgCost, totalQty, pos.currentPrice);
          const unrealizedPnLPct = calcUnrealizedPnLPct(newAvgCost, unrealizedPnL, totalQty);
          const updated: Position = {
            ...pos,
            quantity: totalQty,
            avgCost: newAvgCost,
            unrealizedPnL,
            unrealizedPnLPct,
            marketValue: totalQty * pos.currentPrice,
          };
          setAccount((acc) => {
            const newCashUsed = acc.cashUsed + fillPrice * quantity;
            return {
              ...acc,
              cashUsed: newCashUsed,
              buyingPower: calcBuyingPower(acc.balance, newCashUsed),
            };
          });
          return [...prevPositions.slice(0, idx), updated, ...prevPositions.slice(idx + 1)];
        }

        // ── Opposite direction: close (and optionally reverse) ───────────
        const closingQty = Math.min(quantity, pos.quantity);
        const pnl =
          pos.side === 'long'
            ? (fillPrice - pos.avgCost) * closingQty
            : (pos.avgCost - fillPrice) * closingQty;
        const pnlPct = pos.avgCost === 0 ? 0 : pnl / (pos.avgCost * closingQty);

        const trade: Trade = {
          id: generateId(),
          symbol,
          side,
          quantity: closingQty,
          entryPrice: pos.avgCost,
          exitPrice: fillPrice,
          pnl,
          pnlPct,
          timestamp: now,
          entryTime: pos.openTime,
          exitTime: now,
        };

        const costBasis = pos.avgCost * closingQty;
        // Schedule after the positions state has settled.
        setTimeout(() => recordTrade(trade, costBasis), 0);

        const remaining = quantity - pos.quantity;
        if (remaining > 0) {
          // Fully close and reverse into a new position.
          const newPos: Position = {
            symbol,
            quantity: remaining,
            avgCost: fillPrice,
            side: side === 'buy' ? 'long' : 'short',
            currentPrice: fillPrice,
            unrealizedPnL: 0,
            unrealizedPnLPct: 0,
            marketValue: fillPrice * remaining,
            openTime: now,
          };
          // The reversed portion adds cash used; closing portion is handled in recordTrade.
          setAccount((acc) => {
            const newCashUsed = acc.cashUsed + fillPrice * remaining;
            return {
              ...acc,
              cashUsed: newCashUsed,
              buyingPower: calcBuyingPower(acc.balance, newCashUsed),
            };
          });
          return [...prevPositions.filter((_, i) => i !== idx), newPos];
        }

        if (remaining === 0) {
          // Exact full close with no reversal.
          return prevPositions.filter((_, i) => i !== idx);
        }

        // Partial close — reduce the existing position.
        const newQty = pos.quantity - closingQty;
        const unrealizedPnL = calcUnrealizedPnL(pos.side, pos.avgCost, newQty, pos.currentPrice);
        const unrealizedPnLPct = calcUnrealizedPnLPct(pos.avgCost, unrealizedPnL, newQty);
        const updated: Position = {
          ...pos,
          quantity: newQty,
          unrealizedPnL,
          unrealizedPnLPct,
          marketValue: newQty * pos.currentPrice,
        };
        return [...prevPositions.slice(0, idx), updated, ...prevPositions.slice(idx + 1)];
      });

      return filled;
    },
    [riskSettings.slippage, recordTrade],
  );

  // ── cancelOrder ───────────────────────────────────────────────────────────
  const cancelOrder = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId && o.status === 'pending' ? { ...o, status: 'cancelled' } : o,
      ),
    );
  }, []);

  // ── closePosition (full market close) ────────────────────────────────────
  const closePosition = useCallback(
    (symbol: string, currentPrice: number) => {
      setPositions((prevPositions) => {
        const pos = prevPositions.find((p) => p.symbol === symbol);
        if (!pos) return prevPositions;

        const slip = riskSettings.slippage;
        // Selling a long → fill is lower; buying back a short → fill is higher.
        const fillPrice =
          currentPrice * (1 + slip * (pos.side === 'long' ? -1 : 1));

        const pnl =
          pos.side === 'long'
            ? (fillPrice - pos.avgCost) * pos.quantity
            : (pos.avgCost - fillPrice) * pos.quantity;
        const pnlPct =
          pos.avgCost === 0 ? 0 : pnl / (pos.avgCost * pos.quantity);

        const now = Date.now();
        const trade: Trade = {
          id: generateId(),
          symbol,
          side: pos.side === 'long' ? 'sell' : 'buy',
          quantity: pos.quantity,
          entryPrice: pos.avgCost,
          exitPrice: fillPrice,
          pnl,
          pnlPct,
          timestamp: now,
          entryTime: pos.openTime,
          exitTime: now,
        };
        const closingOrder: Order = {
          id: generateId(),
          symbol,
          side: pos.side === 'long' ? 'sell' : 'buy',
          type: 'market',
          quantity: pos.quantity,
          status: 'filled',
          fillPrice,
          timestamp: now,
          pnl,
        };

        const costBasis = pos.avgCost * pos.quantity;
        setOrders((prev) => [...prev, closingOrder]);
        setTimeout(() => recordTrade(trade, costBasis), 0);

        return prevPositions.filter((p) => p.symbol !== symbol);
      });
    },
    [riskSettings.slippage, recordTrade],
  );

  // ── closePartialPosition ──────────────────────────────────────────────────
  const closePartialPosition = useCallback(
    (symbol: string, quantity: number, currentPrice: number) => {
      setPositions((prevPositions) => {
        const idx = prevPositions.findIndex((p) => p.symbol === symbol);
        if (idx === -1) return prevPositions;

        const pos = prevPositions[idx];
        const qty = Math.min(quantity, pos.quantity);
        const slip = riskSettings.slippage;
        const fillPrice =
          currentPrice * (1 + slip * (pos.side === 'long' ? -1 : 1));

        const pnl =
          pos.side === 'long'
            ? (fillPrice - pos.avgCost) * qty
            : (pos.avgCost - fillPrice) * qty;
        const pnlPct = pos.avgCost === 0 ? 0 : pnl / (pos.avgCost * qty);

        const now = Date.now();
        const trade: Trade = {
          id: generateId(),
          symbol,
          side: pos.side === 'long' ? 'sell' : 'buy',
          quantity: qty,
          entryPrice: pos.avgCost,
          exitPrice: fillPrice,
          pnl,
          pnlPct,
          timestamp: now,
          entryTime: pos.openTime,
          exitTime: now,
        };
        const closingOrder: Order = {
          id: generateId(),
          symbol,
          side: pos.side === 'long' ? 'sell' : 'buy',
          type: 'market',
          quantity: qty,
          status: 'filled',
          fillPrice,
          timestamp: now,
          pnl,
        };

        const costBasis = pos.avgCost * qty;
        setOrders((prev) => [...prev, closingOrder]);
        setTimeout(() => recordTrade(trade, costBasis), 0);

        if (qty >= pos.quantity) {
          return prevPositions.filter((_, i) => i !== idx);
        }

        const newQty = pos.quantity - qty;
        const unrealizedPnL = calcUnrealizedPnL(pos.side, pos.avgCost, newQty, pos.currentPrice);
        const unrealizedPnLPct = calcUnrealizedPnLPct(pos.avgCost, unrealizedPnL, newQty);
        const updated: Position = {
          ...pos,
          quantity: newQty,
          unrealizedPnL,
          unrealizedPnLPct,
          marketValue: newQty * pos.currentPrice,
        };
        return [...prevPositions.slice(0, idx), updated, ...prevPositions.slice(idx + 1)];
      });
    },
    [riskSettings.slippage, recordTrade],
  );

  // ── addAlert ──────────────────────────────────────────────────────────────
  const addAlert = useCallback(
    (
      symbol: string,
      condition: 'above' | 'below',
      price: number,
      message?: string,
    ) => {
      const alert: Alert = {
        id: generateId(),
        symbol,
        condition,
        price,
        message,
        triggered: false,
        createdAt: Date.now(),
      };
      setAlerts((prev) => [...prev, alert]);
    },
    [],
  );

  // ── removeAlert ───────────────────────────────────────────────────────────
  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── updatePositionPrices ──────────────────────────────────────────────────
  const updatePositionPrices = useCallback((priceMap: Record<string, number>) => {
    setPositions((prev) =>
      prev.map((pos) => {
        const price = priceMap[pos.symbol];
        if (price === undefined || price === pos.currentPrice) return pos;
        const unrealizedPnL = calcUnrealizedPnL(pos.side, pos.avgCost, pos.quantity, price);
        const unrealizedPnLPct = calcUnrealizedPnLPct(pos.avgCost, unrealizedPnL, pos.quantity);
        return {
          ...pos,
          currentPrice: price,
          unrealizedPnL,
          unrealizedPnLPct,
          marketValue: price * pos.quantity,
        };
      }),
    );
  }, []);

  // ── checkAlerts ───────────────────────────────────────────────────────────
  const checkAlerts = useCallback((priceMap: Record<string, number>): Alert[] => {
    const triggered: Alert[] = [];
    const now = Date.now();

    setAlerts((prev) =>
      prev.map((alert) => {
        if (alert.triggered) return alert;
        const price = priceMap[alert.symbol];
        if (price === undefined) return alert;

        const fired =
          (alert.condition === 'above' && price >= alert.price) ||
          (alert.condition === 'below' && price <= alert.price);

        if (!fired) return alert;

        const updated: Alert = { ...alert, triggered: true, triggeredAt: now };
        triggered.push(updated);
        return updated;
      }),
    );

    return triggered;
  }, []);

  // ── updateRiskSettings ────────────────────────────────────────────────────
  const updateRiskSettings = useCallback((settings: Partial<RiskSettings>) => {
    setRiskSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  // ── resetAccount ──────────────────────────────────────────────────────────
  const resetAccount = useCallback(() => {
    const fresh = buildInitialState();
    setAccount(fresh.account);
    setPositions([]);
    setOrders([]);
    setTrades([]);
    setAlerts([]);
    setRiskSettings(buildDefaultRiskSettings());
    setEquityHistory(fresh.equityHistory);
    dailyPnLDateRef.current = fresh.dailyPnLDate;
  }, []);

  // ── getStats ──────────────────────────────────────────────────────────────
  const getStats = useCallback(
    () => ({
      ...deriveStats(trades),
      maxDrawdown: calcMaxDrawdown(equityHistory),
    }),
    [trades, equityHistory],
  );

  // ─── Context value ──────────────────────────────────────────────────────────

  const value: TradingContextValue = {
    account,
    positions,
    orders,
    trades,
    alerts,
    riskSettings,
    equityHistory,
    placeOrder,
    cancelOrder,
    closePosition,
    closePartialPosition,
    addAlert,
    removeAlert,
    updatePositionPrices,
    checkAlerts,
    updateRiskSettings,
    resetAccount,
    getStats,
    brokerMode,
    setBrokerMode,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrading(): TradingContextValue {
  const ctx = useContext(TradingContext);
  if (!ctx) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return ctx;
}
