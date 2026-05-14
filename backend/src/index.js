import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import marketRouter from './routes/market.js';
import brokerRouter from './routes/broker.js';
import scannerRouter from './routes/scanner.js';
import { generateQuote } from './services/generator.js';
import { isConfigured } from './services/alpacaClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '../../frontend/dist');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', marketRouter);
app.use('/api/broker', brokerRouter);
app.use('/api/scanner', scannerRouter);
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'Nexus Backend' }));

// Serve the built frontend if the dist directory exists
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback — let React Router handle all non-API routes
  app.get('*', (_, res) => res.sendFile(join(DIST, 'index.html')));
}

const server = createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Map();

wss.on('connection', (ws) => {
  const id = `${Date.now()}-${Math.random()}`;
  clients.set(id, { ws, symbols: [] });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
        const client = clients.get(id);
        if (client) client.symbols = msg.symbols;
        sendPrices(ws, msg.symbols);
      }
    } catch {}
  });

  ws.on('close', () => clients.delete(id));
  ws.on('error', () => clients.delete(id));
  ws.send(JSON.stringify({ type: 'connected', id }));
});

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const [, { ws }] of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function sendPrices(ws, symbols) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const update = {};
  symbols.forEach(sym => {
    const q = generateQuote(sym);
    if (q) {
      const jitter = (Math.random() - 0.5) * 0.003;
      update[sym] = {
        price: parseFloat((q.price * (1 + jitter)).toFixed(4)),
        change: q.change,
        changePercent: q.changePercent,
        volume: q.volume,
        high: q.high,
        low: q.low,
      };
    }
  });
  if (Object.keys(update).length > 0) {
    ws.send(JSON.stringify({ type: 'prices', data: update }));
  }
}

// Push simulated live price ticks every 3 seconds
setInterval(() => {
  for (const [, { ws, symbols }] of clients) {
    if (symbols.length > 0) sendPrices(ws, symbols);
  }
}, 3000);

// ── Alpaca trade-update WebSocket ─────────────────────────────────────────────
// If API keys are set, stream trade_updates from both paper and live accounts
// and relay fills to all connected browser clients.
function connectAlpacaStream(paper) {
  if (!isConfigured()) return;
  const url = paper
    ? 'wss://paper-api.alpaca.markets/stream'
    : 'wss://api.alpaca.markets/stream';

  const ws = new WebSocket(url);

  ws.on('open', () => {
    ws.send(JSON.stringify({
      action: 'authenticate',
      data: { key_id: process.env.ALPACA_KEY_ID, secret_key: process.env.ALPACA_SECRET_KEY },
    }));
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.stream === 'authorization' && msg.data?.status === 'authorized') {
        ws.send(JSON.stringify({ action: 'listen', data: { streams: ['trade_updates'] } }));
        console.log(`\x1b[32m✦ Alpaca ${paper ? 'paper' : 'live'} stream connected\x1b[0m`);
      }
      if (msg.stream === 'trade_updates') {
        broadcast({ type: 'broker_fill', data: msg.data, paper });
      }
    } catch {}
  });

  ws.on('close', () => {
    // Reconnect after 10 seconds on unexpected disconnect
    setTimeout(() => connectAlpacaStream(paper), 10_000);
  });

  ws.on('error', () => {}); // Handled by 'close'
}

server.listen(PORT, () => {
  console.log(`\x1b[36m✦ Nexus Backend\x1b[0m running on http://localhost:${PORT}`);
  if (isConfigured()) {
    connectAlpacaStream(true);  // paper
    connectAlpacaStream(false); // live
  } else {
    console.log('\x1b[33m  Alpaca not configured — copy backend/.env.example to backend/.env and add your keys\x1b[0m');
  }
});
