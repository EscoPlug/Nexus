import { ema, sma } from './moving-averages';
import type { OHLCVBar } from '../types';

export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain += d > 0 ? d : 0;
    avgLoss += d < 0 ? -d : 0;
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  out.push(100 - 100 / (1 + rs0));

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macdLine: (number | null)[]; signalLine: (number | null)[]; histogram: (number | null)[] } {
  const n = closes.length;
  const macdLine: (number | null)[] = new Array(n).fill(null);
  const signalLine: (number | null)[] = new Array(n).fill(null);
  const histogram: (number | null)[] = new Array(n).fill(null);

  const kf = 2 / (fast + 1);
  const ks = 2 / (slow + 1);
  const kg = 2 / (signal + 1);

  let fastEMA = 0, slowEMA = 0;
  for (let i = 0; i < fast; i++) fastEMA += closes[i];
  fastEMA /= fast;

  for (let i = 0; i < slow; i++) slowEMA += closes[i];
  slowEMA /= slow;

  for (let i = fast; i < slow; i++) {
    fastEMA = closes[i] * kf + fastEMA * (1 - kf);
  }

  let signalEMA = 0;
  let macdCount = 0;

  for (let i = slow - 1; i < n; i++) {
    if (i > slow - 1) {
      fastEMA = closes[i] * kf + fastEMA * (1 - kf);
      slowEMA = closes[i] * ks + slowEMA * (1 - ks);
    }
    const m = fastEMA - slowEMA;
    macdLine[i] = m;
    macdCount++;

    if (macdCount < signal) {
      signalEMA += m;
    } else if (macdCount === signal) {
      signalEMA = (signalEMA + m) / signal;
      signalLine[i] = signalEMA;
      histogram[i] = m - signalEMA;
    } else {
      signalEMA = m * kg + signalEMA * (1 - kg);
      signalLine[i] = signalEMA;
      histogram[i] = m - signalEMA;
    }
  }

  return { macdLine, signalLine, histogram };
}

export function stochastic(
  bars: OHLCVBar[],
  kPeriod = 14,
  dPeriod = 3,
  smooth = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const k: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i < kPeriod - 1) { k.push(null); continue; }
    let hi = -Infinity, lo = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].high);
      lo = Math.min(lo, bars[j].low);
    }
    k.push(hi === lo ? 50 : ((bars[i].close - lo) / (hi - lo)) * 100);
  }

  const validK = k.filter(v => v !== null) as number[];
  const smoothedK = sma(validK, smooth);
  const kOut: (number | null)[] = [];
  let idx = 0;
  for (const v of k) {
    kOut.push(v === null ? null : (smoothedK[idx++] ?? null));
  }

  const validSmK = kOut.filter(v => v !== null) as number[];
  const dRaw = sma(validSmK, dPeriod);
  const dOut: (number | null)[] = [];
  let di = 0;
  for (const v of kOut) {
    dOut.push(v === null ? null : (dRaw[di++] ?? null));
  }

  return { k: kOut, d: dOut };
}

export function cci(bars: OHLCVBar[], period = 20): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const slice = bars.slice(i - period + 1, i + 1);
    const tps = slice.map(b => (b.high + b.low + b.close) / 3);
    const mean = tps.reduce((a, b) => a + b, 0) / period;
    const mad = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    out.push(mad === 0 ? 0 : (tps[tps.length - 1] - mean) / (0.015 * mad));
  }
  return out;
}

export function williamsR(bars: OHLCVBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].high);
      lo = Math.min(lo, bars[j].low);
    }
    out.push(hi === lo ? -50 : ((hi - bars[i].close) / (hi - lo)) * -100);
  }
  return out;
}

export function mfi(bars: OHLCVBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period) { out.push(null); continue; }
    let posFlow = 0, negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const tp = (bars[j].high + bars[j].low + bars[j].close) / 3;
      const prevTp = (bars[j - 1].high + bars[j - 1].low + bars[j - 1].close) / 3;
      const mf = tp * bars[j].volume;
      if (tp > prevTp) posFlow += mf;
      else negFlow += mf;
    }
    out.push(negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow));
  }
  return out;
}

export function roc(closes: number[], period = 12): (number | null)[] {
  return closes.map((c, i) =>
    i < period ? null : ((c - closes[i - period]) / closes[i - period]) * 100
  );
}

export function tsi(closes: number[], r = 25, s = 13): (number | null)[] {
  const changes = closes.map((c, i) => (i === 0 ? 0 : c - closes[i - 1]));
  const absChanges = changes.map(Math.abs);

  const ema1 = ema(changes, r);
  const ema2Vals = ema1.filter(v => v !== null) as number[];
  const ema2raw = ema(ema2Vals, s);

  const absEma1 = ema(absChanges, r);
  const absEma2Vals = absEma1.filter(v => v !== null) as number[];
  const absEma2raw = ema(absEma2Vals, s);

  const out: (number | null)[] = [];
  let idx1 = 0, idx2 = 0;
  for (let i = 0; i < ema1.length; i++) {
    if (ema1[i] === null || absEma1[i] === null) { out.push(null); continue; }
    const num = ema2raw[idx1++];
    const den = absEma2raw[idx2++];
    if (num === null || den === null || den === 0) { out.push(null); continue; }
    out.push((num / den) * 100);
  }
  return out;
}

export function ultimateOscillator(bars: OHLCVBar[], p1 = 7, p2 = 14, p3 = 28): (number | null)[] {
  const out: (number | null)[] = [];
  const bps: number[] = [];
  const trs: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const pc = bars[i - 1].close;
    const lo = Math.min(bars[i].low, pc);
    const hi = Math.max(bars[i].high, pc);
    bps.push(bars[i].close - lo);
    trs.push(hi - lo);
  }

  const maxP = Math.max(p1, p2, p3);
  for (let i = 0; i < bars.length; i++) {
    if (i < maxP) { out.push(null); continue; }
    const sum = (period: number) => {
      let bp = 0, tr = 0;
      for (let j = i - period; j < i; j++) {
        bp += bps[j];
        tr += trs[j];
      }
      return tr === 0 ? 0 : bp / tr;
    };
    out.push((4 * sum(p1) + 2 * sum(p2) + sum(p3)) / 7 * 100);
  }
  return out;
}

export function awesomeOscillator(bars: OHLCVBar[]): (number | null)[] {
  const midpoints = bars.map(b => (b.high + b.low) / 2);
  const s5 = sma(midpoints, 5);
  const s34 = sma(midpoints, 34);
  return s5.map((v, i) => (v === null || s34[i] === null ? null : v - s34[i]!));
}

export function trix(closes: number[], period = 18): (number | null)[] {
  const e1 = ema(closes, period);
  const validE1 = e1.filter(v => v !== null) as number[];
  const e2raw = ema(validE1, period);
  const validE2 = e2raw.filter(v => v !== null) as number[];
  const e3raw = ema(validE2, period);

  const out: (number | null)[] = [];
  let e2i = 0, e3i = 0;
  let prevE3: number | null = null;

  for (let i = 0; i < e1.length; i++) {
    if (e1[i] === null) { out.push(null); continue; }
    const e2 = e2raw[e2i++];
    if (e2 === null) { out.push(null); continue; }
    const e3 = e3raw[e3i++];
    if (e3 === null) { prevE3 = null; out.push(null); continue; }
    if (prevE3 === null) { prevE3 = e3; out.push(null); continue; }
    out.push(((e3 - prevE3) / prevE3) * 100);
    prevE3 = e3;
  }
  return out;
}

export function cmo(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(null); continue; }
    let up = 0, dn = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - closes[j - 1];
      if (d > 0) up += d;
      else dn -= d;
    }
    out.push(up + dn === 0 ? 0 : ((up - dn) / (up + dn)) * 100);
  }
  return out;
}

export function dpo(closes: number[], period = 20): (number | null)[] {
  const shift = Math.floor(period / 2) + 1;
  const smaVals = sma(closes, period);
  return closes.map((c, i) => {
    const si = i - shift;
    if (si < 0 || smaVals[si] === null) return null;
    return c - smaVals[si]!;
  });
}
