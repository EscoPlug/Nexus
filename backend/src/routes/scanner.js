import { Router } from 'express';
import { isConfigured } from '../services/alpacaClient.js';
import { getTopMovers, getMostActives, getSnapshots } from '../services/alpacaData.js';

const router = Router();

// Symbol → { name, sector } lookup for enriching Alpaca results
const META = {
  AAPL: { name: 'Apple Inc.', sector: 'Tech' },
  MSFT: { name: 'Microsoft Corp.', sector: 'Tech' },
  NVDA: { name: 'NVIDIA Corp.', sector: 'Tech' },
  META: { name: 'Meta Platforms', sector: 'Tech' },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Tech' },
  AMZN: { name: 'Amazon.com Inc.', sector: 'Tech' },
  TSLA: { name: 'Tesla Inc.', sector: 'Tech' },
  AMD: { name: 'Advanced Micro Devices', sector: 'Tech' },
  NFLX: { name: 'Netflix Inc.', sector: 'Tech' },
  CRM: { name: 'Salesforce Inc.', sector: 'Tech' },
  ORCL: { name: 'Oracle Corp.', sector: 'Tech' },
  ADBE: { name: 'Adobe Inc.', sector: 'Tech' },
  INTC: { name: 'Intel Corp.', sector: 'Tech' },
  QCOM: { name: 'Qualcomm Inc.', sector: 'Tech' },
  AVGO: { name: 'Broadcom Inc.', sector: 'Tech' },
  AMAT: { name: 'Applied Materials', sector: 'Tech' },
  MU: { name: 'Micron Technology', sector: 'Tech' },
  PANW: { name: 'Palo Alto Networks', sector: 'Tech' },
  CRWD: { name: 'CrowdStrike Holdings', sector: 'Tech' },
  NET: { name: 'Cloudflare Inc.', sector: 'Tech' },
  ZS: { name: 'Zscaler Inc.', sector: 'Tech' },
  DDOG: { name: 'Datadog Inc.', sector: 'Tech' },
  SNOW: { name: 'Snowflake Inc.', sector: 'Tech' },
  PLTR: { name: 'Palantir Technologies', sector: 'Tech' },
  BB: { name: 'BlackBerry Ltd.', sector: 'Tech' },
  NOK: { name: 'Nokia Corp.', sector: 'Tech' },
  IONQ: { name: 'IonQ Inc.', sector: 'Tech' },
  JPM: { name: 'JPMorgan Chase & Co.', sector: 'Finance' },
  BAC: { name: 'Bank of America Corp.', sector: 'Finance' },
  WFC: { name: 'Wells Fargo & Co.', sector: 'Finance' },
  GS: { name: 'Goldman Sachs Group', sector: 'Finance' },
  MS: { name: 'Morgan Stanley', sector: 'Finance' },
  C: { name: 'Citigroup Inc.', sector: 'Finance' },
  BLK: { name: 'BlackRock Inc.', sector: 'Finance' },
  V: { name: 'Visa Inc.', sector: 'Finance' },
  MA: { name: 'Mastercard Inc.', sector: 'Finance' },
  PYPL: { name: 'PayPal Holdings', sector: 'Finance' },
  SOFI: { name: 'SoFi Technologies', sector: 'Finance' },
  COIN: { name: 'Coinbase Global', sector: 'Crypto' },
  HOOD: { name: 'Robinhood Markets', sector: 'Finance' },
  UNH: { name: 'UnitedHealth Group', sector: 'Health' },
  JNJ: { name: 'Johnson & Johnson', sector: 'Health' },
  LLY: { name: 'Eli Lilly and Co.', sector: 'Health' },
  PFE: { name: 'Pfizer Inc.', sector: 'Health' },
  MRK: { name: 'Merck & Co.', sector: 'Health' },
  ABBV: { name: 'AbbVie Inc.', sector: 'Health' },
  AMGN: { name: 'Amgen Inc.', sector: 'Health' },
  GILD: { name: 'Gilead Sciences', sector: 'Health' },
  MRNA: { name: 'Moderna Inc.', sector: 'Health' },
  VRTX: { name: 'Vertex Pharmaceuticals', sector: 'Health' },
  XOM: { name: 'Exxon Mobil Corp.', sector: 'Energy' },
  CVX: { name: 'Chevron Corp.', sector: 'Energy' },
  COP: { name: 'ConocoPhillips', sector: 'Energy' },
  OXY: { name: 'Occidental Petroleum', sector: 'Energy' },
  EOG: { name: 'EOG Resources', sector: 'Energy' },
  DVN: { name: 'Devon Energy Corp.', sector: 'Energy' },
  HAL: { name: 'Halliburton Co.', sector: 'Energy' },
  SLB: { name: 'Schlumberger Ltd.', sector: 'Energy' },
  WMT: { name: 'Walmart Inc.', sector: 'Retail' },
  COST: { name: 'Costco Wholesale', sector: 'Retail' },
  TGT: { name: 'Target Corp.', sector: 'Retail' },
  HD: { name: 'Home Depot Inc.', sector: 'Retail' },
  NKE: { name: 'NIKE Inc.', sector: 'Retail' },
  MCD: { name: "McDonald's Corp.", sector: 'Retail' },
  SBUX: { name: 'Starbucks Corp.', sector: 'Retail' },
  GME: { name: 'GameStop Corp.', sector: 'Retail' },
  AMC: { name: 'AMC Entertainment', sector: 'Media' },
  GE: { name: 'GE Aerospace', sector: 'Industrial' },
  HON: { name: 'Honeywell International', sector: 'Industrial' },
  BA: { name: 'Boeing Co.', sector: 'Industrial' },
  CAT: { name: 'Caterpillar Inc.', sector: 'Industrial' },
  DE: { name: 'Deere & Company', sector: 'Industrial' },
  UPS: { name: 'United Parcel Service', sector: 'Industrial' },
  FDX: { name: 'FedEx Corp.', sector: 'Industrial' },
  LMT: { name: 'Lockheed Martin Corp.', sector: 'Industrial' },
  LCID: { name: 'Lucid Group', sector: 'EV' },
  RIVN: { name: 'Rivian Automotive', sector: 'EV' },
  NIO: { name: 'NIO Inc.', sector: 'EV' },
  XPEV: { name: 'XPeng Inc.', sector: 'EV' },
  MARA: { name: 'Marathon Digital', sector: 'Crypto' },
  RIOT: { name: 'Riot Platforms', sector: 'Crypto' },
  TLRY: { name: 'Tilray Brands', sector: 'Cannabis' },
  DIS: { name: 'The Walt Disney Co.', sector: 'Media' },
  T: { name: 'AT&T Inc.', sector: 'Telecom' },
  VZ: { name: 'Verizon Communications', sector: 'Telecom' },
  TMUS: { name: 'T-Mobile US', sector: 'Telecom' },
  KO: { name: 'The Coca-Cola Company', sector: 'Food' },
  PEP: { name: 'PepsiCo Inc.', sector: 'Food' },
  RKLB: { name: 'Rocket Lab USA', sector: 'Aero' },
  SPCE: { name: 'Virgin Galactic', sector: 'Aero' },
};

function buildRow(entry, snap) {
  const daily = snap?.dailyBar;
  const prev = snap?.prevDailyBar;
  const trade = snap?.latestTrade;

  const price = trade?.p ?? daily?.c ?? entry.price ?? 0;
  const prevClose = prev?.c ?? 0;

  let changePercent = entry.percent_change ?? 0;
  if (!entry.percent_change && prevClose && daily?.c) {
    changePercent = ((daily.c - prevClose) / prevClose) * 100;
  }
  changePercent = Math.round(changePercent * 100) / 100;

  const volume = entry.volume ?? daily?.v ?? 0;
  const prevVol = prev?.v ?? 0;
  const relVolume = prevVol > 0 ? Math.round((volume / prevVol) * 100) / 100 : 1;

  const gapPercent = (prevClose && daily?.o)
    ? Math.round(((daily.o - prevClose) / prevClose) * 10000) / 100
    : 0;

  const meta = META[entry.symbol] || { name: entry.symbol, sector: '' };

  return {
    symbol: entry.symbol,
    name: meta.name,
    sector: meta.sector,
    price: Math.round(price * 100) / 100,
    changePercent,
    volume,
    relVolume,
    floatM: 0,
    gapPercent,
    hasNews: false,
    newsHeadline: '',
  };
}

router.get('/', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ source: 'unconfigured' });
  }

  const tab = String(req.query.tab || 'gainers').toLowerCase();
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  try {
    let entries = [];

    if (tab === 'gainers' || tab === 'losers') {
      const movers = await getTopMovers(limit);
      entries = tab === 'gainers' ? movers.gainers : movers.losers;
    } else if (tab === 'volume') {
      entries = await getMostActives('volume', limit);
    } else if (tab === 'momentum') {
      entries = await getMostActives('trades', limit);
    } else if (tab === 'gappers') {
      // Fetch a larger set then filter by gap%
      const actives = await getMostActives('volume', 100);
      const snaps = await getSnapshots(actives.map(e => e.symbol));
      const rows = actives
        .map(e => buildRow(e, snaps[e.symbol]))
        .filter(r => Math.abs(r.gapPercent) >= 2)
        .sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent))
        .slice(0, limit);
      return res.json({ source: 'live', rows, lastUpdated: new Date().toISOString() });
    }

    const symbols = entries.map(e => e.symbol);
    const snaps = symbols.length ? await getSnapshots(symbols) : {};
    const rows = entries.map(e => buildRow(e, snaps[e.symbol]));

    res.json({ source: 'live', rows, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error('Scanner route error:', err.message);
    res.status(500).json({ source: 'error', error: err.message });
  }
});

export default router;
