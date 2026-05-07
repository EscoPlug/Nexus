import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import marketRouter from './routes/market.js';
import { generateQuote } from './services/generator.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', marketRouter);
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'Nexus Backend' }));

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
        // Send initial prices immediately
        sendPrices(ws, msg.symbols);
      }
    } catch {}
  });

  ws.on('close', () => clients.delete(id));
  ws.on('error', () => clients.delete(id));
  ws.send(JSON.stringify({ type: 'connected', id }));
});

function sendPrices(ws, symbols) {
  if (ws.readyState !== 1) return;
  const update = {};
  symbols.forEach(sym => {
    const q = generateQuote(sym);
    if (q) {
      // Add tiny jitter to simulate live movement
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

server.listen(PORT, () => {
  console.log(`\x1b[36m✦ Nexus Backend\x1b[0m running on http://localhost:${PORT}`);
});
