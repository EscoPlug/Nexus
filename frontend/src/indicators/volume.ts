import { ema, sma } from './moving-averages';
import type { OHLCVBar } from '../types';

export function obv(bars: OHLCVBar[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    const prev = out[i - 1];
    if (bars[i].close > bars[i - 1].close) out.push(prev + bars[i].volume);
    else if (bars[i].close < bars[i - 1].close) out.push(prev - bars[i].volume);
    else out.push(prev);
  }
  return out;
}

export function accDist(bars: OHLCVBar[]): number[] {
  const out: number[] = [0];
  for (let i = 0; i < bars.length; i++) {
    const hl = bars[i].high - bars[i].low;
    const clv = hl === 0 ? 0 : ((bars[i].close - bars[i].low) - (bars[i].high - bars[i].close)) / hl;
    out.push((out[out.length - 1] || 0) + clv * bars[i].volume);
  }
  return out.slice(1);
}

export function cmf(bars: OHLCVBar[], period = 20): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let mfvSum = 0, volSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const hl = bars[j].high - bars[j].low;
      const clv = hl === 0 ? 0 : ((bars[j].close - bars[j].low) - (bars[j].high - bars[j].close)) / hl;
      mfvSum += clv * bars[j].volume;
      volSum += bars[j].volume;
    }
    out.push(volSum === 0 ? 0 : mfvSum / volSum);
  }
  return out;
}

export function forceIndex(bars: OHLCVBar[], period = 13): (number | null)[] {
  const raw = bars.map((b, i) =>
    i === 0 ? 0 : (b.close - bars[i - 1].close) * b.volume
  );
  return ema(raw, period);
}

export function chaikinOscillator(bars: OHLCVBar[], fast = 3, slow = 10): (number | null)[] {
  const ad = accDist(bars);
  const fastEma = ema(ad, fast);
  const slowEma = ema(ad, slow);
  return fastEma.map((f, i) =>
    f === null || slowEma[i] === null ? null : f - slowEma[i]!
  );
}

export function volumeROC(bars: OHLCVBar[], period = 12): (number | null)[] {
  return bars.map((b, i) =>
    i < period ? null : ((b.volume - bars[i - period].volume) / bars[i - period].volume) * 100
  );
}

export function eom(bars: OHLCVBar[], period = 14): (number | null)[] {
  const raw: (number | null)[] = bars.map((b, i) => {
    if (i === 0) return null;
    const dm = (b.high + b.low) / 2 - (bars[i - 1].high + bars[i - 1].low) / 2;
    const box = b.volume / 1e6 / (b.high - b.low || 1);
    return box === 0 ? 0 : dm / box;
  });
  const validRaw = raw.filter(v => v !== null) as number[];
  const smoothed = sma(validRaw, period);

  const out: (number | null)[] = [];
  let idx = 0;
  for (const v of raw) {
    out.push(v === null ? null : (smoothed[idx++] ?? null));
  }
  return out;
}

export function klinger(
  bars: OHLCVBar[],
  fast = 34,
  slow = 55,
  signal = 13
): { kvo: (number | null)[]; signalLine: (number | null)[] } {
  const sv: number[] = bars.map((b, i) => {
    if (i === 0) return 0;
    const tp = b.high + b.low + b.close;
    const prevTp = bars[i - 1].high + bars[i - 1].low + bars[i - 1].close;
    return tp > prevTp ? b.volume : tp < prevTp ? -b.volume : 0;
  });

  const fastEma = ema(sv, fast);
  const slowEma = ema(sv, slow);
  const kvo = fastEma.map((f, i) =>
    f === null || slowEma[i] === null ? null : f - slowEma[i]!
  );

  const validKvo = kvo.filter(v => v !== null) as number[];
  const sigRaw = ema(validKvo, signal);
  const signalLine: (number | null)[] = [];
  let si = 0;
  for (const v of kvo) {
    signalLine.push(v === null ? null : (sigRaw[si++] ?? null));
  }

  return { kvo, signalLine };
}
