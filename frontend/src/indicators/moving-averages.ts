import type { OHLCVBar } from '../types';

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i < period - 1) {
      out.push(null);
    } else {
      out.push(sum / period);
      sum -= values[i - period + 1];
    }
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (i === period - 1) {
      let s = 0;
      for (let j = 0; j < period; j++) s += values[j];
      prev = s / period;
      out.push(prev);
      continue;
    }
    prev = values[i] * k + prev! * (1 - k);
    out.push(prev);
  }
  return out;
}

export function wma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - j] * (period - j);
    out.push(sum / denom);
  }
  return out;
}

export function dema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const validE1 = e1.filter(v => v !== null) as number[];
  const e2raw = ema(validE1, period);

  const out: (number | null)[] = [];
  let e2idx = 0;
  for (let i = 0; i < e1.length; i++) {
    if (e1[i] === null) { out.push(null); continue; }
    const e2val = e2raw[e2idx++];
    if (e2val === null) { out.push(null); continue; }
    out.push(2 * e1[i]! - e2val);
  }
  return out;
}

export function tema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const validE1 = e1.filter(v => v !== null) as number[];
  const e2raw = ema(validE1, period);
  const validE2 = e2raw.filter(v => v !== null) as number[];
  const e3raw = ema(validE2, period);

  const out: (number | null)[] = [];
  let e2idx = 0, e3idx = 0;
  for (let i = 0; i < e1.length; i++) {
    if (e1[i] === null) { out.push(null); continue; }
    const e2val = e2raw[e2idx++];
    if (e2val === null) { out.push(null); continue; }
    const e3val = e3raw[e3idx++];
    if (e3val === null) { out.push(null); continue; }
    out.push(3 * e1[i]! - 3 * e2val + e3val);
  }
  return out;
}

export function hullMA(values: number[], period: number): (number | null)[] {
  const half = Math.floor(period / 2);
  const sqrt = Math.round(Math.sqrt(period));
  const wma1 = wma(values, half);
  const wma2 = wma(values, period);

  const diff: (number | null)[] = wma1.map((v, i) =>
    v !== null && wma2[i] !== null ? 2 * v - wma2[i]! : null
  );

  const validDiff = diff.filter(v => v !== null) as number[];
  const smoothed = wma(validDiff, sqrt);

  const out: (number | null)[] = [];
  let idx = 0;
  for (let i = 0; i < diff.length; i++) {
    if (diff[i] === null) { out.push(null); continue; }
    out.push(smoothed[idx++]);
  }
  return out;
}

export function vwap(bars: OHLCVBar[]): (number | null)[] {
  const out: (number | null)[] = [];
  let cumPV = 0, cumV = 0;
  let lastDay = -1;

  for (const bar of bars) {
    const day = Math.floor(bar.time / 86400);
    if (day !== lastDay) {
      cumPV = 0;
      cumV = 0;
      lastDay = day;
    }
    const typical = (bar.high + bar.low + bar.close) / 3;
    cumPV += typical * bar.volume;
    cumV += bar.volume;
    out.push(cumV > 0 ? cumPV / cumV : null);
  }
  return out;
}

export function alma(values: number[], period = 9, offset = 0.85, sigma = 6): (number | null)[] {
  const m = offset * (period - 1);
  const s = period / sigma;
  const weights: number[] = [];
  let wSum = 0;
  for (let i = 0; i < period; i++) {
    weights[i] = Math.exp(-((i - m) ** 2) / (2 * s * s));
    wSum += weights[i];
  }

  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += weights[j] * values[i - period + 1 + j];
    out.push(sum / wSum);
  }
  return out;
}

export function mcginleyDynamic(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (prev === null) {
      prev = values[i];
      out.push(null);
      continue;
    }
    prev = prev + (values[i] - prev) / (period * Math.pow(values[i] / prev, 4));
    out.push(prev);
  }
  return out;
}
