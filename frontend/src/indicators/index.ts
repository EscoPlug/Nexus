export * from './moving-averages';
export * from './momentum';
export * from './volatility';
export * from './volume';
export * from './trend';
export * from './advanced';

import type { IndicatorDef } from '../types';

export const INDICATOR_DEFS: IndicatorDef[] = [
  // ─── Overlay ────────────────────────────────────────────────────────────────
  {
    id: 'sma', name: 'Simple Moving Average', shortName: 'SMA', category: 'overlay',
    description: 'Average price over N periods',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 500 },
      { key: 'source', label: 'Source', type: 'select', default: 'close', options: ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4'] },
      { key: 'color', label: 'Color', type: 'color', default: '#f6c90e' },
    ],
  },
  {
    id: 'ema', name: 'Exponential Moving Average', shortName: 'EMA', category: 'overlay',
    description: 'Exponentially weighted moving average giving more weight to recent prices',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 500 },
      { key: 'source', label: 'Source', type: 'select', default: 'close', options: ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4'] },
      { key: 'color', label: 'Color', type: 'color', default: '#3498db' },
    ],
  },
  {
    id: 'wma', name: 'Weighted Moving Average', shortName: 'WMA', category: 'overlay',
    description: 'Weighted average that gives more weight to recent data',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 500 },
      { key: 'color', label: 'Color', type: 'color', default: '#e74c3c' },
    ],
  },
  {
    id: 'dema', name: 'Double EMA', shortName: 'DEMA', category: 'overlay',
    description: 'Double Exponential Moving Average — reduces lag of standard EMA',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#9b59b6' },
    ],
  },
  {
    id: 'tema', name: 'Triple EMA', shortName: 'TEMA', category: 'overlay',
    description: 'Triple Exponential Moving Average — minimal lag',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#1abc9c' },
    ],
  },
  {
    id: 'hma', name: 'Hull Moving Average', shortName: 'HMA', category: 'overlay',
    description: 'Responsive moving average with minimal lag, developed by Alan Hull',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 4, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#e67e22' },
    ],
  },
  {
    id: 'alma', name: 'ALMA', shortName: 'ALMA', category: 'overlay',
    description: 'Arnaud Legoux Moving Average — minimizes noise while reducing lag',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 9, min: 2, max: 200 },
      { key: 'offset', label: 'Offset', type: 'number', default: 0.85, min: 0, max: 1 },
      { key: 'sigma', label: 'Sigma', type: 'number', default: 6, min: 1, max: 20 },
      { key: 'color', label: 'Color', type: 'color', default: '#ff6b9d' },
    ],
  },
  {
    id: 'vwap', name: 'VWAP', shortName: 'VWAP', category: 'overlay',
    description: 'Volume Weighted Average Price — institutional benchmark',
    params: [
      { key: 'color', label: 'Color', type: 'color', default: '#8e44ad' },
    ],
  },
  {
    id: 'bb', name: 'Bollinger Bands', shortName: 'BB', category: 'overlay',
    description: 'Price channels based on standard deviation from a moving average',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'mult', label: 'Multiplier', type: 'number', default: 2, min: 0.5, max: 5 },
      { key: 'colorUpper', label: 'Upper Color', type: 'color', default: '#3498db' },
      { key: 'colorMid', label: 'Middle Color', type: 'color', default: '#f39c12' },
      { key: 'colorLower', label: 'Lower Color', type: 'color', default: '#3498db' },
    ],
  },
  {
    id: 'keltner', name: 'Keltner Channels', shortName: 'KC', category: 'overlay',
    description: 'Volatility-based channels using EMA and ATR',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'mult', label: 'Multiplier', type: 'number', default: 2, min: 0.5, max: 5 },
      { key: 'color', label: 'Color', type: 'color', default: '#2ecc71' },
    ],
  },
  {
    id: 'donchian', name: 'Donchian Channels', shortName: 'DC', category: 'overlay',
    description: 'Highest high and lowest low channels over N periods',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#16a085' },
    ],
  },
  {
    id: 'ichimoku', name: 'Ichimoku Cloud', shortName: 'Ichimoku', category: 'overlay', isPremium: true,
    description: 'Japanese multi-component indicator showing support, resistance, trend and momentum',
    params: [
      { key: 'conversion', label: 'Conversion', type: 'number', default: 9, min: 2, max: 50 },
      { key: 'base', label: 'Base', type: 'number', default: 26, min: 2, max: 100 },
      { key: 'spanB', label: 'Span B', type: 'number', default: 52, min: 2, max: 200 },
      { key: 'displacement', label: 'Displacement', type: 'number', default: 26, min: 1, max: 100 },
    ],
  },
  {
    id: 'psar', name: 'Parabolic SAR', shortName: 'PSAR', category: 'overlay',
    description: 'Trend-following stop-and-reverse system by Welles Wilder',
    params: [
      { key: 'step', label: 'Step', type: 'number', default: 0.02, min: 0.001, max: 0.1 },
      { key: 'maxStep', label: 'Max Step', type: 'number', default: 0.2, min: 0.01, max: 0.5 },
      { key: 'color', label: 'Color', type: 'color', default: '#f39c12' },
    ],
  },
  {
    id: 'supertrend', name: 'SuperTrend', shortName: 'ST', category: 'overlay', isPremium: true,
    description: 'ATR-based trend following indicator with directional signals',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 10, min: 2, max: 100 },
      { key: 'mult', label: 'Multiplier', type: 'number', default: 3, min: 0.5, max: 10 },
    ],
  },
  {
    id: 'alligator', name: "Williams' Alligator", shortName: 'Alligator', category: 'overlay', isPremium: true,
    description: 'Bill Williams indicator using three smoothed MAs (jaw, teeth, lips)',
    params: [
      { key: 'colorJaw', label: 'Jaw', type: 'color', default: '#3498db' },
      { key: 'colorTeeth', label: 'Teeth', type: 'color', default: '#e74c3c' },
      { key: 'colorLips', label: 'Lips', type: 'color', default: '#2ecc71' },
    ],
  },
  // ─── Momentum ───────────────────────────────────────────────────────────────
  {
    id: 'rsi', name: 'Relative Strength Index', shortName: 'RSI', category: 'momentum',
    description: 'Momentum oscillator measuring speed and change of price movements (0-100)',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'overbought', label: 'Overbought', type: 'number', default: 70, min: 50, max: 100 },
      { key: 'oversold', label: 'Oversold', type: 'number', default: 30, min: 0, max: 50 },
      { key: 'color', label: 'Color', type: 'color', default: '#9b59b6' },
    ],
  },
  {
    id: 'macd', name: 'MACD', shortName: 'MACD', category: 'momentum',
    description: 'Moving Average Convergence Divergence — trend-following momentum indicator',
    params: [
      { key: 'fast', label: 'Fast', type: 'number', default: 12, min: 2, max: 100 },
      { key: 'slow', label: 'Slow', type: 'number', default: 26, min: 2, max: 200 },
      { key: 'signal', label: 'Signal', type: 'number', default: 9, min: 2, max: 50 },
    ],
  },
  {
    id: 'stoch', name: 'Stochastic', shortName: 'Stoch', category: 'momentum',
    description: 'Momentum oscillator comparing closing price to price range',
    params: [
      { key: 'kPeriod', label: '%K Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'dPeriod', label: '%D Period', type: 'number', default: 3, min: 1, max: 20 },
      { key: 'smooth', label: 'Smooth', type: 'number', default: 3, min: 1, max: 10 },
    ],
  },
  {
    id: 'stochrsi', name: 'Stochastic RSI', shortName: 'StochRSI', category: 'momentum', isPremium: true,
    description: 'Stochastic applied to RSI values for extreme overbought/oversold readings',
    params: [
      { key: 'rsiPeriod', label: 'RSI Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'stochPeriod', label: 'Stoch Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'kSmooth', label: 'K Smooth', type: 'number', default: 3, min: 1, max: 10 },
      { key: 'dSmooth', label: 'D Smooth', type: 'number', default: 3, min: 1, max: 10 },
    ],
  },
  {
    id: 'cci', name: 'Commodity Channel Index', shortName: 'CCI', category: 'momentum',
    description: 'Measures deviation of price from its average — identifies cyclical turns',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#e67e22' },
    ],
  },
  {
    id: 'willr', name: "Williams %R", shortName: 'W%R', category: 'momentum',
    description: 'Momentum indicator measuring overbought/oversold levels (-100 to 0)',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#e74c3c' },
    ],
  },
  {
    id: 'mfi', name: 'Money Flow Index', shortName: 'MFI', category: 'momentum',
    description: 'Volume-weighted RSI measuring buying/selling pressure',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#1abc9c' },
    ],
  },
  {
    id: 'roc', name: 'Rate of Change', shortName: 'ROC', category: 'momentum',
    description: 'Percentage change in price over N periods',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 12, min: 1, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#3498db' },
    ],
  },
  {
    id: 'tsi', name: 'True Strength Index', shortName: 'TSI', category: 'momentum', isPremium: true,
    description: 'Double-smoothed price change momentum indicator',
    params: [
      { key: 'r', label: 'R Period', type: 'number', default: 25, min: 2, max: 100 },
      { key: 's', label: 'S Period', type: 'number', default: 13, min: 2, max: 50 },
      { key: 'color', label: 'Color', type: 'color', default: '#9b59b6' },
    ],
  },
  {
    id: 'uo', name: 'Ultimate Oscillator', shortName: 'UO', category: 'momentum', isPremium: true,
    description: 'Combines short, medium, and long-term price momentum',
    params: [
      { key: 'p1', label: 'Period 1', type: 'number', default: 7, min: 2, max: 50 },
      { key: 'p2', label: 'Period 2', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'p3', label: 'Period 3', type: 'number', default: 28, min: 2, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#f39c12' },
    ],
  },
  {
    id: 'ao', name: 'Awesome Oscillator', shortName: 'AO', category: 'momentum',
    description: 'Bill Williams oscillator measuring market momentum (SMA5-SMA34 of midpoints)',
    params: [],
  },
  {
    id: 'trix', name: 'TRIX', shortName: 'TRIX', category: 'momentum',
    description: 'Rate of change of triple-smoothed EMA, filters out insignificant cycles',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 18, min: 2, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#e74c3c' },
    ],
  },
  {
    id: 'cmo', name: 'Chande Momentum Oscillator', shortName: 'CMO', category: 'momentum', isPremium: true,
    description: 'Measures pure momentum without smoothing',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#2ecc71' },
    ],
  },
  {
    id: 'dpo', name: 'Detrended Price Oscillator', shortName: 'DPO', category: 'momentum',
    description: 'Removes trend to show price cycles',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#3498db' },
    ],
  },
  // ─── Volume ─────────────────────────────────────────────────────────────────
  {
    id: 'volume', name: 'Volume', shortName: 'Vol', category: 'volume',
    description: 'Raw trading volume shown as histogram',
    params: [
      { key: 'colorUp', label: 'Up Color', type: 'color', default: '#26a69a' },
      { key: 'colorDown', label: 'Down Color', type: 'color', default: '#ef5350' },
    ],
  },
  {
    id: 'obv', name: 'On Balance Volume', shortName: 'OBV', category: 'volume',
    description: 'Cumulative volume to confirm price trends',
    params: [
      { key: 'color', label: 'Color', type: 'color', default: '#3498db' },
    ],
  },
  {
    id: 'cmf', name: 'Chaikin Money Flow', shortName: 'CMF', category: 'volume',
    description: 'Measures buying/selling pressure using volume and price range',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#2ecc71' },
    ],
  },
  {
    id: 'fi', name: 'Force Index', shortName: 'FI', category: 'volume',
    description: 'Combines price change and volume to measure strength of bulls/bears',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 13, min: 1, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#e67e22' },
    ],
  },
  {
    id: 'vroc', name: 'Volume ROC', shortName: 'VROC', category: 'volume',
    description: 'Rate of change applied to volume',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 12, min: 1, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#9b59b6' },
    ],
  },
  // ─── Volatility ─────────────────────────────────────────────────────────────
  {
    id: 'atr', name: 'Average True Range', shortName: 'ATR', category: 'volatility',
    description: 'Measures market volatility as smoothed average of true range',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#e74c3c' },
    ],
  },
  {
    id: 'hv', name: 'Historical Volatility', shortName: 'HV', category: 'volatility', isPremium: true,
    description: 'Annualized volatility from log returns',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#3498db' },
    ],
  },
  {
    id: 'stddev', name: 'Standard Deviation', shortName: 'StdDev', category: 'volatility',
    description: 'Statistical measure of price dispersion',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 2, max: 200 },
      { key: 'color', label: 'Color', type: 'color', default: '#f39c12' },
    ],
  },
  // ─── Trend ──────────────────────────────────────────────────────────────────
  {
    id: 'adx', name: 'ADX / DMI', shortName: 'ADX', category: 'trend',
    description: 'Average Directional Index measuring trend strength with ±DI lines',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 100 },
    ],
  },
  {
    id: 'aroon', name: 'Aroon', shortName: 'Aroon', category: 'trend',
    description: 'Identifies trend changes and strength using recent highs/lows',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 25, min: 2, max: 200 },
    ],
  },
  {
    id: 'vortex', name: 'Vortex Indicator', shortName: 'Vortex', category: 'trend', isPremium: true,
    description: 'Identifies start of new trends and confirms ongoing trends',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 100 },
    ],
  },
  // ─── Advanced / Premium ─────────────────────────────────────────────────────
  {
    id: 'pivots', name: 'Pivot Points', shortName: 'Pivots', category: 'advanced', isPremium: true,
    description: 'Standard/Fibonacci/Camarilla support and resistance levels',
    params: [
      { key: 'type', label: 'Type', type: 'select', default: 'standard', options: ['standard', 'fibonacci', 'camarilla'] },
    ],
  },
  {
    id: 'elderray', name: 'Elder Ray Index', shortName: 'Elder Ray', category: 'advanced', isPremium: true,
    description: 'Bull and bear power relative to an EMA baseline',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 13, min: 2, max: 100 },
    ],
  },
  {
    id: 'coppock', name: 'Coppock Curve', shortName: 'Coppock', category: 'advanced', isPremium: true,
    description: 'Long-term buy signal indicator originally designed for monthly charts',
    params: [
      { key: 'roc1', label: 'ROC 1', type: 'number', default: 11, min: 2, max: 50 },
      { key: 'roc2', label: 'ROC 2', type: 'number', default: 14, min: 2, max: 50 },
      { key: 'wma', label: 'WMA', type: 'number', default: 10, min: 2, max: 50 },
      { key: 'color', label: 'Color', type: 'color', default: '#9b59b6' },
    ],
  },
  {
    id: 'fisher', name: 'Fisher Transform', shortName: 'Fisher', category: 'advanced', isPremium: true,
    description: 'Converts price to Gaussian normal distribution — highlights reversals',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 9, min: 2, max: 50 },
    ],
  },
  {
    id: 'smcbias', name: 'Smart Money Bias', shortName: 'SMC', category: 'advanced', isPremium: true,
    description: 'Order block detection — identifies institutional buying/selling zones',
    params: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 5, max: 100 },
      { key: 'color', label: 'Color', type: 'color', default: '#8e44ad' },
    ],
  },
];
