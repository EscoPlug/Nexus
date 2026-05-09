// Alpaca REST API client — pure fetch, no SDK, ESM-compatible
const PAPER_BASE = 'https://paper-api.alpaca.markets';
const LIVE_BASE = 'https://api.alpaca.markets';

const KEY_ID = process.env.ALPACA_KEY_ID || '';
const SECRET_KEY = process.env.ALPACA_SECRET_KEY || '';

export function isConfigured() {
  return Boolean(KEY_ID && SECRET_KEY);
}

function base(paper) {
  return paper ? PAPER_BASE : LIVE_BASE;
}

function authHeaders() {
  return {
    'APCA-API-KEY-ID': KEY_ID,
    'APCA-API-SECRET-KEY': SECRET_KEY,
    'Content-Type': 'application/json',
  };
}

async function apiFetch(path, options = {}, paper = true) {
  const url = `${base(paper)}${path}`;
  const res = await fetch(url, { ...options, headers: authHeaders() });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data.message || `Alpaca ${res.status}: ${path}`);
  return data;
}

export async function placeOrder({ symbol, qty, side, type, limit_price, stop_price, paper = true }) {
  const body = {
    symbol: symbol.toUpperCase(),
    qty: String(qty),
    side,
    type,
    time_in_force: 'day',
  };
  if (limit_price) body.limit_price = String(limit_price);
  if (stop_price) body.stop_price = String(stop_price);
  return apiFetch('/v2/orders', { method: 'POST', body: JSON.stringify(body) }, paper);
}

export async function cancelOrder(orderId, paper = true) {
  const res = await fetch(`${base(paper)}/v2/orders/${orderId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.ok || res.status === 422; // 422 = already filled/cancelled
}

export async function getPositions(paper = true) {
  return apiFetch('/v2/positions', {}, paper);
}

export async function getAccount(paper = true) {
  return apiFetch('/v2/account', {}, paper);
}

export async function getOrders(paper = true, status = 'all') {
  return apiFetch(`/v2/orders?status=${status}&limit=50&direction=desc`, {}, paper);
}
