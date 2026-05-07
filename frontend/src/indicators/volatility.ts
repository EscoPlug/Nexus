import { sma, ema } from './moving-averages';
import type { OHLCVBar } from '../types';

export function atr(bars: OHLCVBar[], period = 14): (number | null)[] {
  const trs: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) { trs.push(bars[i].high - bars[i].low); continue; }
    const pc = bars[i - 1].close;
    trs.push(Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc)));
  }

  const out: (number | null)[] = new Array(period).fill(null);
  let avgTR = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(avgTR);

  for (let i = period + 1; i < trs.length; i++) {
    avgTR = (avgTR * (period - 1) + trs[i]) / period;
    out.push(avgTR);
  }
  return out;
}

export function bollingerBands(
  closes: number[],
  period = 20,
  mult = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i]!;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + mult * sd);
    lower.push(mean - mult * sd);
  }
  return { upper, middle, lower };
}

export function keltnerChannels(
  bars: OHLCVBar[],
  period = 20,
  mult = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const closes = bars.map(b => b.close);
  const middle = ema(closes, period);
  const atrVals = atr(bars, period);

  const upper = middle.map((m, i) =>
    m === null || atrVals[i] === null ? null : m + mult * atrVals[i]!
  );
  const lower = middle.map((m, i) =>
    m === null || atrVals[i] === null ? null : m - mult * atrVals[i]!
  );
  return { upper, middle, lower };
}

export function donchianChannels(
  bars: OHLCVBar[],
  period = 20
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].high);
      lo = Math.min(lo, bars[j].low);
    }
    upper.push(hi);
    lower.push(lo);
  }
  const middle = upper.map((u, i) =>
    u === null || lower[i] === null ? null : (u + lower[i]!) / 2
  );
  return { upper, middle, lower };
}

export function historicalVolatility(closes: number[], period = 20): (number | null)[] {
  const logReturns = closes.map((c, i) => (i === 0 ? null : Math.log(c / closes[i - 1])));
  const out: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(null); continue; }
    const slice = logReturns.slice(i - period + 1, i + 1).filter(v => v !== null) as number[];
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (slice.length - 1);
    out.push(Math.sqrt(variance * 252) * 100);
  }
  return out;
}

export function standardDeviation(closes: number[], period = 20): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    out.push(Math.sqrt(variance));
  }
  return out;
}
