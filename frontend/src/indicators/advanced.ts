import { ema, sma } from './moving-averages';
import { rsi } from './momentum';
import type { OHLCVBar } from '../types';

export function pivotPoints(bars: OHLCVBar[], type: 'standard' | 'fibonacci' | 'camarilla' = 'standard') {
  const results: {
    pp: number; r1: number; r2: number; r3: number;
    s1: number; s2: number; s3: number; time: number;
  }[] = [];

  if (type === 'standard') {
    for (const bar of bars) {
      const pp = (bar.high + bar.low + bar.close) / 3;
      results.push({
        time: bar.time,
        pp,
        r1: 2 * pp - bar.low,
        r2: pp + (bar.high - bar.low),
        r3: bar.high + 2 * (pp - bar.low),
        s1: 2 * pp - bar.high,
        s2: pp - (bar.high - bar.low),
        s3: bar.low - 2 * (bar.high - pp),
      });
    }
  } else if (type === 'fibonacci') {
    for (const bar of bars) {
      const pp = (bar.high + bar.low + bar.close) / 3;
      const range = bar.high - bar.low;
      results.push({
        time: bar.time,
        pp,
        r1: pp + 0.382 * range,
        r2: pp + 0.618 * range,
        r3: pp + range,
        s1: pp - 0.382 * range,
        s2: pp - 0.618 * range,
        s3: pp - range,
      });
    }
  } else {
    for (const bar of bars) {
      const range = bar.high - bar.low;
      const pp = (bar.high + bar.low + bar.close) / 3;
      results.push({
        time: bar.time,
        pp,
        r1: bar.close + range * 1.1 / 12,
        r2: bar.close + range * 1.1 / 6,
        r3: bar.close + range * 1.1 / 4,
        s1: bar.close - range * 1.1 / 12,
        s2: bar.close - range * 1.1 / 6,
        s3: bar.close - range * 1.1 / 4,
      });
    }
  }
  return results;
}

export function elderRayIndex(bars: OHLCVBar[], period = 13): {
  bullPower: (number | null)[];
  bearPower: (number | null)[];
} {
  const closes = bars.map(b => b.close);
  const emaVals = ema(closes, period);

  const bullPower = bars.map((b, i) =>
    emaVals[i] === null ? null : b.high - emaVals[i]!
  );
  const bearPower = bars.map((b, i) =>
    emaVals[i] === null ? null : b.low - emaVals[i]!
  );

  return { bullPower, bearPower };
}

export function coppockCurve(closes: number[], roc1 = 11, roc2 = 14, wmaLen = 10): (number | null)[] {
  const r1 = closes.map((c, i) => i < roc1 ? null : ((c - closes[i - roc1]) / closes[i - roc1]) * 100);
  const r2 = closes.map((c, i) => i < roc2 ? null : ((c - closes[i - roc2]) / closes[i - roc2]) * 100);

  const sum: (number | null)[] = r1.map((v, i) =>
    v === null || r2[i] === null ? null : v + r2[i]!
  );

  const validSum = sum.filter(v => v !== null) as number[];
  const denom = (wmaLen * (wmaLen + 1)) / 2;
  const wmaOut: (number | null)[] = [];

  for (let i = 0; i < validSum.length; i++) {
    if (i < wmaLen - 1) { wmaOut.push(null); continue; }
    let s = 0;
    for (let j = 0; j < wmaLen; j++) s += validSum[i - j] * (wmaLen - j);
    wmaOut.push(s / denom);
  }

  const out: (number | null)[] = [];
  let wi = 0;
  for (const v of sum) {
    out.push(v === null ? null : (wmaOut[wi++] ?? null));
  }
  return out;
}

export function fisherTransform(bars: OHLCVBar[], period = 9): {
  fisher: (number | null)[];
  signal: (number | null)[];
} {
  const fisher: (number | null)[] = [];
  const signal: (number | null)[] = [null];

  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { fisher.push(null); continue; }
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].high);
      lo = Math.min(lo, bars[j].low);
    }
    const range = hi - lo;
    let value = range === 0 ? 0 : 2 * ((bars[i].close - lo) / range) - 1;
    value = Math.max(-0.999, Math.min(0.999, value));
    const f = 0.5 * Math.log((1 + value) / (1 - value));
    fisher.push(f);
    if (fisher.length > 1) signal.push(fisher[fisher.length - 2]);
  }

  return { fisher, signal };
}

export function stochasticRSI(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const rsiVals = rsi(closes, rsiPeriod);
  const k: (number | null)[] = [];

  for (let i = 0; i < rsiVals.length; i++) {
    if (rsiVals[i] === null || i < stochPeriod - 1) { k.push(null); continue; }
    const slice = rsiVals.slice(i - stochPeriod + 1, i + 1).filter(v => v !== null) as number[];
    if (slice.length < stochPeriod) { k.push(null); continue; }
    const lo = Math.min(...slice);
    const hi = Math.max(...slice);
    k.push(hi === lo ? 50 : ((rsiVals[i]! - lo) / (hi - lo)) * 100);
  }

  const validK = k.filter(v => v !== null) as number[];
  const smK = sma(validK, kSmooth);
  const kOut: (number | null)[] = [];
  let ki = 0;
  for (const v of k) {
    kOut.push(v === null ? null : (smK[ki++] ?? null));
  }

  const validKOut = kOut.filter(v => v !== null) as number[];
  const smD = sma(validKOut, dSmooth);
  const dOut: (number | null)[] = [];
  let di = 0;
  for (const v of kOut) {
    dOut.push(v === null ? null : (smD[di++] ?? null));
  }

  return { k: kOut, d: dOut };
}

export function williamsAlligator(bars: OHLCVBar[]): {
  jaw: (number | null)[];
  teeth: (number | null)[];
  lips: (number | null)[];
} {
  const medians = bars.map(b => (b.high + b.low) / 2);
  const smma13Raw = smaSmoothed(medians, 13);
  const smma8Raw = smaSmoothed(medians, 8);
  const smma5Raw = smaSmoothed(medians, 5);

  const jaw = shiftRight(smma13Raw, 8);
  const teeth = shiftRight(smma8Raw, 5);
  const lips = shiftRight(smma5Raw, 3);

  return { jaw, teeth, lips };
}

function smaSmoothed(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(period - 1).fill(null);
  let sum = values.slice(0, period).reduce((a, b) => a + b, 0);
  out.push(sum / period);
  for (let i = period; i < values.length; i++) {
    sum = sum - sum / period + values[i];
    out.push(sum / period);
  }
  return out;
}

function shiftRight(values: (number | null)[], shift: number): (number | null)[] {
  return [...new Array(shift).fill(null), ...values.slice(0, values.length - shift)];
}

export function heikinAshi(bars: OHLCVBar[]): OHLCVBar[] {
  const out: OHLCVBar[] = [];
  for (let i = 0; i < bars.length; i++) {
    const haClose = (bars[i].open + bars[i].high + bars[i].low + bars[i].close) / 4;
    const haOpen = i === 0
      ? (bars[i].open + bars[i].close) / 2
      : (out[i - 1].open + out[i - 1].close) / 2;
    const haHigh = Math.max(bars[i].high, haOpen, haClose);
    const haLow = Math.min(bars[i].low, haOpen, haClose);
    out.push({ time: bars[i].time, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: bars[i].volume });
  }
  return out;
}

export function smartMoneyBias(bars: OHLCVBar[], period = 20): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const slice = bars.slice(i - period + 1, i + 1);
    let bullOB = 0, bearOB = 0;
    for (let j = 1; j < slice.length; j++) {
      if (slice[j].close > slice[j].open && slice[j - 1].close < slice[j - 1].open) bullOB++;
      if (slice[j].close < slice[j].open && slice[j - 1].close > slice[j - 1].open) bearOB++;
    }
    out.push((bullOB - bearOB) / period * 100);
  }
  return out;
}
