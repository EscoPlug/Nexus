import { Router } from 'express';
import {
  isConfigured, placeOrder, cancelOrder, getPositions, getAccount, getOrders,
} from '../services/alpacaClient.js';

const router = Router();

// Status — lets the frontend know if API keys are configured
router.get('/status', (_req, res) => {
  res.json({ configured: isConfigured() });
});

// Place order
router.post('/order', async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'Alpaca API keys not configured in backend .env' });
  try {
    const { paper = true, symbol, qty, side, type, limit_price, stop_price } = req.body;
    const order = await placeOrder({ symbol, qty, side, type, limit_price, stop_price, paper });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel order
router.delete('/order/:id', async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'Alpaca API keys not configured' });
  try {
    const paper = req.query.paper !== 'false';
    const ok = await cancelOrder(req.params.id, paper);
    res.json({ ok });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List positions
router.get('/positions', async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'Alpaca API keys not configured' });
  try {
    const paper = req.query.paper !== 'false';
    const positions = await getPositions(paper);
    res.json(positions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Account info
router.get('/account', async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'Alpaca API keys not configured' });
  try {
    const paper = req.query.paper !== 'false';
    const account = await getAccount(paper);
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Recent orders
router.get('/orders', async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'Alpaca API keys not configured' });
  try {
    const paper = req.query.paper !== 'false';
    const orders = await getOrders(paper);
    res.json(orders);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
