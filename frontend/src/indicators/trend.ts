import { ema, sma } from './moving-averages';
import { atr } from './volatility';
import type { OHLCVBar } from '../types';

export function ichimoku(bars: OHLCVBar[], conversion = 9, base = 26, spanB = 52, displacement = 26) {
  const tenkan: (number | null)[] = [];
  const kijun: (number | null)[] = [];
  const senkouA: (number | null)[] = [];
  const senkouB: (number | null)[] = [];
  const chikou: (number | null)[] = [];

  const midpoint = (period: number, i: number) => {
    if (i < period - 1) return null;
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].high);
      lo = Math.min(lo, bars[j].low);
    }
    return (hi + lo) / 2;
  };

  for (let i = 0; i < bars.length; i++) {
    tenkan.push(midpoint(conversion, i));
    kijun.push(midpoint(base, i));
    chikou.push(i + displacement < bars.length ? bars[i + displacement].close : null);

    const t = tenkan[i], k = kijun[i];
    const fwdIdx = i + displacement;
    if (fwdIdx < bars.length) {
      senkouA[fwdIdx] = t !== null && k !== null ? (t + k) / 2 : null;
    }
    const sb = midpoint(spanB, i);
    if (i + displacement < bars.length) {
      senkouB[i + displacement] = sb;
    }
  }

  // Fill missing indices
  while (senkouA.length < bars.length) senkouA.push(null);
  while (senkouB.length < bars.length) senkouB.push(null);

  return { tenkan, kijun, senkouA, senkouB, chikou };
}

export function parabolicSAR(bars: OHLCVBar[], step = 0.02, maxStep = 0.2): (number | null)[] {
  if (bars.length < 2) return bars.map(() => null);

  const out: (number | null)[] = [null];
  let bull = true;
  let sar = bars[0].low;
  let ep = bars[0].high;
  let af = step;

  for (let i = 1; i < bars.length; i++) {
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);

    if (bull) {
      sar = Math.min(sar, bars[i - 1].low, i >= 2 ? bars[i - 2].low : bars[i - 1].low);
      if (bars[i].low < sar) {
        bull = false;
        sar = ep;
        ep = bars[i].low;
        af = step;
      } else {
        if (bars[i].high > ep) {
          ep = bars[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      sar = Math.max(sar, bars[i - 1].high, i >= 2 ? bars[i - 2].high : bars[i - 1].high);
      if (bars[i].high > sar) {
        bull = true;
        sar = ep;
        ep = bars[i].high;
        af = step;
      } else {
        if (bars[i].low < ep) {
          ep = bars[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }
    out.push(sar);
  }
  return out;
}

export function superTrend(
  bars: OHLCVBar[],
  period = 10,
  mult = 3
): { trend: (number | null)[]; direction: (number | null)[] } {
  const atrVals = atr(bars, period);
  const trend: (number | null)[] = [];
  const direction: (number | null)[] = [];

  let prevUpper = 0, prevLower = 0, prevTrend = 0;

  for (let i = 0; i < bars.length; i++) {
    if (atrVals[i] === null) {
      trend.push(null);
      direction.push(null);
      continue;
    }
    const hl2 = (bars[i].high + bars[i].low) / 2;
    let upper = hl2 + mult * atrVals[i]!;
    let lower = hl2 - mult * atrVals[i]!;

    if (i > 0 && prevUpper !== 0) {
      upper = upper < prevUpper || bars[i - 1].close > prevUpper ? upper : prevUpper;
      lower = lower > prevLower || bars[i - 1].close < prevLower ? lower : prevLower;
    }

    let dir: number;
    if (prevTrend === 0) {
      dir = 1;
    } else if (prevTrend === prevUpper) {
      dir = bars[i].close > upper ? -1 : 1;
    } else {
      dir = bars[i].close < lower ? 1 : -1;
    }

    const trendVal = dir === 1 ? upper : lower;
    trend.push(trendVal);
    direction.push(dir);

    prevUpper = upper;
    prevLower = lower;
    prevTrend = trendVal;
  }

  return { trend, direction };
}

export function adx(bars: OHLCVBar[], period = 14): {
  adx: (number | null)[];
  plusDI: (number | null)[];
  minusDI: (number | null)[];
} {
  const n = bars.length;
  const adxOut: (number | null)[] = new Array(n).fill(null);
  const plusDI: (number | null)[] = new Array(n).fill(null);
  const minusDI: (number | null)[] = new Array(n).fill(null);

  let sumTR = 0, sumPlusDM = 0, sumMinusDM = 0;
  let prevADX: number | null = null;

  for (let i = 1; i < n; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
    const pc = bars[i - 1].close;
    const tr = Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc));

    if (i <= period) {
      sumTR += tr;
      sumPlusDM += plusDM;
      sumMinusDM += minusDM;

      if (i === period) {
        const pdi = (sumPlusDM / sumTR) * 100;
        const mdi = (sumMinusDM / sumTR) * 100;
        plusDI[i] = pdi;
        minusDI[i] = mdi;
        const dx = pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;
        prevADX = dx;
      }
    } else {
      sumTR = sumTR - sumTR / period + tr;
      sumPlusDM = sumPlusDM - sumPlusDM / period + plusDM;
      sumMinusDM = sumMinusDM - sumMinusDM / period + minusDM;

      const pdi = (sumPlusDM / sumTR) * 100;
      const mdi = (sumMinusDM / sumTR) * 100;
      plusDI[i] = pdi;
      minusDI[i] = mdi;
      const dx = pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;

      if (prevADX !== null) {
        prevADX = (prevADX * (period - 1) + dx) / period;
        adxOut[i] = prevADX;
      } else {
        prevADX = dx;
      }
    }
  }

  return { adx: adxOut, plusDI, minusDI };
}

export function aroon(bars: OHLCVBar[], period = 25): {
  upper: (number | null)[];
  lower: (number | null)[];
  oscillator: (number | null)[];
} {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const oscillator: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i < period) {
      upper.push(null);
      lower.push(null);
      oscillator.push(null);
      continue;
    }
    let hiIdx = i, loIdx = i;
    for (let j = i - period; j <= i; j++) {
      if (bars[j].high > bars[hiIdx].high) hiIdx = j;
      if (bars[j].low < bars[loIdx].low) loIdx = j;
    }
    const u = ((hiIdx - (i - period)) / period) * 100;
    const l = ((loIdx - (i - period)) / period) * 100;
    upper.push(u);
    lower.push(l);
    oscillator.push(u - l);
  }
  return { upper, lower, oscillator };
}

export function vortex(bars: OHLCVBar[], period = 14): {
  viPlus: (number | null)[];
  viMinus: (number | null)[];
} {
  const viPlus: (number | null)[] = new Array(period).fill(null);
  const viMinus: (number | null)[] = new Array(period).fill(null);

  for (let i = period; i < bars.length; i++) {
    let vmPlus = 0, vmMinus = 0, trSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      vmPlus += Math.abs(bars[j].high - bars[j - 1].low);
      vmMinus += Math.abs(bars[j].low - bars[j - 1].high);
      const pc = bars[j - 1].close;
      trSum += Math.max(bars[j].high - bars[j].low, Math.abs(bars[j].high - pc), Math.abs(bars[j].low - pc));
    }
    viPlus.push(trSum === 0 ? 0 : vmPlus / trSum);
    viMinus.push(trSum === 0 ? 0 : vmMinus / trSum);
  }
  return { viPlus, viMinus };
}
