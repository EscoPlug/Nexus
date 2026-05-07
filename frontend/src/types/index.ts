export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: number;
  exchange: string;
  currency: string;
  sector?: string;
  industry?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  thumbnail: string | null;
  relatedSymbols: string[];
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export type ChartType = 'candlestick' | 'line' | 'area' | 'bar' | 'heikinashi';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W' | '1M';

export type IndicatorCategory =
  | 'overlay'
  | 'momentum'
  | 'volume'
  | 'volatility'
  | 'trend'
  | 'advanced';

export interface IndicatorParam {
  key: string;
  label: string;
  type: 'number' | 'color' | 'boolean' | 'select';
  default: number | string | boolean;
  min?: number;
  max?: number;
  options?: string[];
}

export interface IndicatorDef {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  isPremium?: boolean;
  description: string;
  params: IndicatorParam[];
}

export interface ActiveIndicator {
  id: string;
  defId: string;
  params: Record<string, number | string | boolean>;
  visible: boolean;
}

export type DrawingToolType =
  | 'none'
  | 'trendline'
  | 'ray'
  | 'hline'
  | 'vline'
  | 'rectangle'
  | 'fibonacci'
  | 'text';

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}
