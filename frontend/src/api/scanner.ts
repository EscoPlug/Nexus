export interface LiveScanRow {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  volume: number;
  relVolume: number;
  floatM: number;
  gapPercent: number;
  hasNews: boolean;
  newsHeadline: string;
}

export interface ScannerResult {
  source: 'live' | 'unconfigured' | 'error';
  rows: LiveScanRow[];
  lastUpdated?: string;
}

export async function fetchLiveScannerData(tab: string, limit = 50): Promise<ScannerResult> {
  const res = await fetch(`/api/scanner?tab=${encodeURIComponent(tab)}&limit=${limit}`);
  if (res.status === 503) return { source: 'unconfigured', rows: [] };
  if (!res.ok) throw new Error(`Scanner ${res.status}`);
  return res.json();
}
