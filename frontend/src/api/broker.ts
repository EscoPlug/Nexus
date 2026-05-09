const API_BASE = '/api/broker';

export interface BrokerOrder {
  id: string;
  symbol: string;
  qty: string;
  side: string;
  type: string;
  status: string;
  filled_qty: string;
  filled_avg_price?: string;
  limit_price?: string;
  stop_price?: string;
  created_at: string;
}

export interface BrokerPosition {
  symbol: string;
  qty: string;
  side: string;
  avg_entry_price: string;
  current_price: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  market_value: string;
}

export interface BrokerAccount {
  id: string;
  equity: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  currency: string;
  status: string;
}

export async function checkBrokerStatus(): Promise<{ configured: boolean }> {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

export async function submitAlpacaOrder(params: {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: string;
  limit_price?: number;
  stop_price?: number;
  paper: boolean;
}): Promise<BrokerOrder> {
  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Order failed');
  }
  return res.json();
}

export async function cancelAlpacaOrder(orderId: string, paper: boolean): Promise<void> {
  await fetch(`${API_BASE}/order/${orderId}?paper=${paper}`, { method: 'DELETE' });
}

export async function fetchAlpacaPositions(paper: boolean): Promise<BrokerPosition[]> {
  const res = await fetch(`${API_BASE}/positions?paper=${paper}`);
  if (!res.ok) throw new Error('Failed to fetch positions');
  return res.json();
}

export async function fetchAlpacaAccount(paper: boolean): Promise<BrokerAccount | null> {
  const res = await fetch(`${API_BASE}/account?paper=${paper}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAlpacaOrders(paper: boolean): Promise<BrokerOrder[]> {
  const res = await fetch(`${API_BASE}/orders?paper=${paper}`);
  if (!res.ok) return [];
  return res.json();
}
