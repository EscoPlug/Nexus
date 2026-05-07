// ─── Order primitives ──────────────────────────────────────────────────────

export type OrderSide = 'buy' | 'sell';

export type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit';

export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

// ─── Core domain objects ───────────────────────────────────────────────────

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  /** Required for limit and stop-limit orders */
  limitPrice?: number;
  /** Required for stop and stop-limit orders */
  stopPrice?: number;
  status: OrderStatus;
  /** Price at which the order was actually filled */
  fillPrice?: number;
  /** Unix ms timestamp of order creation */
  timestamp: number;
  /** Realised P&L attached at fill time (relative to average cost basis) */
  pnl?: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  side: 'long' | 'short';
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  /** quantity * currentPrice */
  marketValue: number;
  /** Unix ms timestamp when the position was opened */
  openTime: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  /** Unix ms timestamp of the closing fill (mirrors exitTime for convenience) */
  timestamp: number;
  entryTime: number;
  exitTime: number;
}

export interface Account {
  balance: number;
  startingBalance: number;
  buyingPower: number;
  /** Capital currently committed to open positions */
  cashUsed: number;
  dailyPnL: number;
  totalPnL: number;
  /** FINRA pattern-day-trader counter (resets after 5 business days) */
  dayTradeCount: number;
  /** 0–1 fraction of winning closed trades */
  winRate: number;
  /** Average dollar gain on winning trades */
  avgWin: number;
  /** Average dollar loss (positive number) on losing trades */
  avgLoss: number;
  /** Gross profit / gross loss ratio */
  profitFactor: number;
  /** Peak-to-trough drawdown on the equity curve (positive number) */
  maxDrawdown: number;
  /** Current consecutive win (positive) or loss (negative) streak */
  streak: number;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  message?: string;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
}

export interface ScanResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  /** Volume relative to 30-day average (e.g. 3.2 = 3.2× average) */
  relVolume: number;
  /** Shares available to trade (free float) */
  float: number;
  marketCap?: number;
  category: 'gainer' | 'loser' | 'volume' | 'momentum' | 'gapper';
}

export interface RiskSettings {
  /** Maximum dollar loss allowed per trading day */
  maxDailyLoss: number;
  /** Maximum dollar value of a single position */
  maxPositionSize: number;
  /** Maximum shares that may be traded in a single order */
  maxSharesPerTrade: number;
  /** Pre-filled share quantity in the order ticket */
  defaultShares: number;
  /** Dollar amount risked per trade */
  riskPerTrade: number;
  /** Fraction applied to fill price to simulate spread/latency (e.g. 0.001 = 0.1%) */
  slippage: number;
}

// ─── Analytics ─────────────────────────────────────────────────────────────

export interface EquityPoint {
  /** Unix ms timestamp */
  timestamp: number;
  balance: number;
  dailyPnL: number;
}
