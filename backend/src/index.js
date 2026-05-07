import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import marketRouter from './routes/market.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', marketRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'Nexus Backend' }));

const server = createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();

async function fetchPrices(symbols) {
  try {
    const { default: yf } = await import('yahoo-finance2');
    const results = await Promise.allSettled(symbols.map(s => yf.quote(s)));
    const prices = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        const q = r.value;
        prices[symbols[i]] = {
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          volume: q.regularMarketVolume,
          high: q.regularMarketDayHigh,
          low: q.regularMarketDayLow,
        };
      }
    });
    return prices;
  } catch {
    return {};
  }
}

wss.on('connection', (ws) => {
  const id = `${Date.now()}-${Math.random()}`;
  clients.set(id, { ws, symbols: [] });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
        const client = clients.get(id);
        if (client) client.symbols = msg.symbols;
      }
    } catch {}
  });

  ws.on('close', () => clients.delete(id));
  ws.on('error', () => clients.delete(id));

  ws.send(JSON.stringify({ type: 'connected', id }));
});

setInterval(async () => {
  const allSymbols = new Set();
  for (const { symbols } of clients.values()) {
    symbols.forEach(s => allSymbols.add(s));
  }
  if (allSymbols.size === 0) return;

  const prices = await fetchPrices([...allSymbols]);

  for (const [, { ws, symbols }] of clients) {
    if (ws.readyState !== 1) continue;
    const update = {};
    symbols.forEach(s => { if (prices[s]) update[s] = prices[s]; });
    if (Object.keys(update).length > 0) {
      ws.send(JSON.stringify({ type: 'prices', data: update }));
    }
  }
}, 5000);

server.listen(PORT, () => {
  console.log(`\x1b[36m✦ Nexus Backend\x1b[0m running on http://localhost:${PORT}`);
});
