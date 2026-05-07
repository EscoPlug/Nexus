# Nexus — Advanced Trading Platform

A professional TradingView-like trading platform with 40+ technical indicators, real-time data via Yahoo Finance, and a full dark-mode UI.

## Quick Start

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm install

# Start both servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Features

- **40+ Indicators**: SMA/EMA/WMA/DEMA/TEMA/HMA, VWAP, Bollinger Bands, Keltner, Ichimoku, SuperTrend, RSI, MACD, Stochastic, CCI, Williams %R, MFI, ADX, Aroon, OBV, ATR, Pivot Points, Fisher Transform, and more
- **Chart Types**: Candlestick, Heikin-Ashi, Bar, Line, Area
- **Timeframes**: 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M
- **Real-time**: WebSocket price updates, live watchlist
- **Symbol Search**: Stocks, ETFs, Crypto, Indices, Forex
- **News Feed**: Per-symbol news from Yahoo Finance
- **Dark Theme**: TradingView-inspired professional UI
- **Data Source**: Yahoo Finance (no API key required)
