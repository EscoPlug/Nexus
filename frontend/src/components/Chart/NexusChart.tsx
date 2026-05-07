import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type DeepPartial,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { OHLCVBar, ActiveIndicator, ChartType, DrawingToolType } from '../../types';
import {
  sma, ema, wma, dema, tema, hullMA, vwap as calcVwap, alma,
  bollingerBands, keltnerChannels, donchianChannels,
  rsi as calcRsi, macd as calcMacd, stochastic, cci as calcCci,
  williamsR, mfi as calcMfi, roc, tsi as calcTsi, ultimateOscillator,
  awesomeOscillator, trix, cmo, dpo,
  obv, cmf, forceIndex, volumeROC,
  atr as calcAtr, historicalVolatility, standardDeviation,
  adx as calcAdx, aroon as calcAroon, vortex as calcVortex,
  ichimoku, parabolicSAR, superTrend, williamsAlligator,
  pivotPoints, elderRayIndex, coppockCurve, fisherTransform,
  stochasticRSI, smartMoneyBias, heikinAshi,
} from '../../indicators';

const DRAW_COLOR = '#f39c12';
const DRAW_COLORS = ['#f39c12', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#1abc9c'];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

interface Drawing {
  id: string;
  tool: DrawingToolType;
  color: string;
  p1: { time: UTCTimestamp; price: number };
  p2?: { time: UTCTimestamp; price: number };
  label?: string;
}

const CHART_BG = '#0d1117';
const CHART_GRID = '#161b22';
const CHART_TEXT = '#8b949e';
const CHART_BORDER = '#21262d';
const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';

interface Props {
  bars: OHLCVBar[];
  chartType: ChartType;
  indicators: ActiveIndicator[];
  drawingTool: DrawingToolType;
  clearDrawings?: number;
  undoDrawing?: number;
  onCrosshairMove?: (data: { price: number | null; time: number | null }) => void;
}

function getSource(bars: OHLCVBar[], source: string): number[] {
  switch (source) {
    case 'open': return bars.map(b => b.open);
    case 'high': return bars.map(b => b.high);
    case 'low': return bars.map(b => b.low);
    case 'hl2': return bars.map(b => (b.high + b.low) / 2);
    case 'hlc3': return bars.map(b => (b.high + b.low + b.close) / 3);
    case 'ohlc4': return bars.map(b => (b.open + b.high + b.low + b.close) / 4);
    default: return bars.map(b => b.close);
  }
}

function toLineData(bars: OHLCVBar[], values: (number | null)[]) {
  return bars
    .map((b, i) => ({ time: b.time as UTCTimestamp, value: values[i] }))
    .filter(d => d.value !== null) as { time: UTCTimestamp; value: number }[];
}

export default function NexusChart({ bars, chartType, indicators, drawingTool, clearDrawings, undoDrawing, onCrosshairMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Bar'> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const subChartsRef = useRef<{ el: HTMLDivElement; chart: IChartApi; id: string }[]>([]);
  const subContainerRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Drawing overlay state
  const drawingsRef = useRef<Drawing[]>([]);
  const pendingP1Ref = useRef<{ time: UTCTimestamp; price: number } | null>(null);
  const drawingToolRef = useRef<DrawingToolType>(drawingTool);
  const colorIndexRef = useRef(0);
  const [svgTick, setSvgTick] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const forceRedraw = useCallback(() => setSvgTick(n => n + 1), []);

  const syncTimeScale = useCallback((source: IChartApi) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const range = source.timeScale().getVisibleLogicalRange();
    if (range) {
      const allCharts = [mainChartRef.current, ...subChartsRef.current.map(s => s.chart)].filter(Boolean) as IChartApi[];
      allCharts.forEach(c => {
        if (c !== source) c.timeScale().setVisibleLogicalRange(range);
      });
    }
    isSyncingRef.current = false;
  }, []);

  const destroySubCharts = useCallback(() => {
    subChartsRef.current.forEach(({ chart, el }) => {
      chart.remove();
      el.remove();
    });
    subChartsRef.current = [];
  }, []);

  const createSubChart = useCallback((id: string) => {
    if (!subContainerRef.current) return null;
    const el = document.createElement('div');
    el.style.cssText = 'width:100%;flex-shrink:0;';
    subContainerRef.current.appendChild(el);

    const chart = createChart(el, {
      layout: { background: { color: CHART_BG }, textColor: CHART_TEXT },
      grid: { vertLines: { color: CHART_GRID }, horzLines: { color: CHART_GRID } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_BORDER },
      timeScale: { borderColor: CHART_BORDER, visible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => syncTimeScale(chart));
    mainChartRef.current?.timeScale().subscribeVisibleLogicalRangeChange(() => syncTimeScale(mainChartRef.current!));

    subChartsRef.current.push({ el, chart, id });
    return chart;
  }, [syncTimeScale]);

  const buildOverlayIndicators = useCallback((chart: IChartApi, activeBars: OHLCVBar[]) => {
    overlaySeriesRef.current.forEach(s => { try { chart.removeSeries(s); } catch {} });
    overlaySeriesRef.current = [];

    for (const ind of indicators) {
      if (!ind.visible) continue;
      const p = ind.params;

      switch (ind.defId) {
        case 'sma': {
          const src = getSource(activeBars, (p.source as string) || 'close');
          const vals = sma(src, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#f6c90e', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'ema': {
          const src = getSource(activeBars, (p.source as string) || 'close');
          const vals = ema(src, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'wma': {
          const vals = wma(activeBars.map(b => b.close), (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'dema': {
          const vals = dema(activeBars.map(b => b.close), (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#9b59b6', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'tema': {
          const vals = tema(activeBars.map(b => b.close), (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#1abc9c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'hma': {
          const vals = hullMA(activeBars.map(b => b.close), (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#e67e22', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'alma': {
          const vals = alma(activeBars.map(b => b.close), (p.period as number) || 9, (p.offset as number) || 0.85, (p.sigma as number) || 6);
          const series = chart.addLineSeries({ color: (p.color as string) || '#ff6b9d', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'vwap': {
          const vals = calcVwap(activeBars);
          const series = chart.addLineSeries({ color: (p.color as string) || '#8e44ad', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'bb': {
          const { upper, middle, lower } = bollingerBands(activeBars.map(b => b.close), (p.period as number) || 20, (p.mult as number) || 2);
          [
            { vals: upper, color: p.colorUpper || '#3498db' },
            { vals: middle, color: p.colorMid || '#f39c12' },
            { vals: lower, color: p.colorLower || '#3498db' },
          ].forEach(({ vals, color }) => {
            const s = chart.addLineSeries({ color: color as string, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            s.setData(toLineData(activeBars, vals));
            overlaySeriesRef.current.push(s);
          });
          break;
        }
        case 'keltner': {
          const { upper, middle, lower } = keltnerChannels(activeBars, (p.period as number) || 20, (p.mult as number) || 2);
          [upper, middle, lower].forEach(vals => {
            const s = chart.addLineSeries({ color: (p.color as string) || '#2ecc71', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            s.setData(toLineData(activeBars, vals));
            overlaySeriesRef.current.push(s);
          });
          break;
        }
        case 'donchian': {
          const { upper, middle, lower } = donchianChannels(activeBars, (p.period as number) || 20);
          [upper, middle, lower].forEach(vals => {
            const s = chart.addLineSeries({ color: (p.color as string) || '#16a085', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            s.setData(toLineData(activeBars, vals));
            overlaySeriesRef.current.push(s);
          });
          break;
        }
        case 'psar': {
          const vals = parabolicSAR(activeBars, (p.step as number) || 0.02, (p.maxStep as number) || 0.2);
          const series = chart.addLineSeries({ color: (p.color as string) || '#f39c12', lineWidth: 1, lineStyle: LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          overlaySeriesRef.current.push(series);
          break;
        }
        case 'supertrend': {
          const { trend } = superTrend(activeBars, (p.period as number) || 10, (p.mult as number) || 3);
          const upSeries = chart.addLineSeries({ color: '#2ecc71', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          const dnSeries = chart.addLineSeries({ color: '#e74c3c', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          upSeries.setData(toLineData(activeBars, trend));
          dnSeries.setData(toLineData(activeBars, trend));
          overlaySeriesRef.current.push(upSeries, dnSeries);
          break;
        }
        case 'ichimoku': {
          const { tenkan, kijun, senkouA, senkouB, chikou } = ichimoku(
            activeBars,
            (p.conversion as number) || 9,
            (p.base as number) || 26,
            (p.spanB as number) || 52,
            (p.displacement as number) || 26
          );
          const colors = ['#e74c3c', '#3498db', '#2ecc71', '#e67e22', '#95a5a6'];
          [tenkan, kijun, senkouA, senkouB, chikou].forEach((vals, i) => {
            const s = chart.addLineSeries({ color: colors[i], lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            s.setData(toLineData(activeBars, vals));
            overlaySeriesRef.current.push(s);
          });
          break;
        }
        case 'alligator': {
          const { jaw, teeth, lips } = williamsAlligator(activeBars);
          [
            { vals: jaw, color: p.colorJaw || '#3498db' },
            { vals: teeth, color: p.colorTeeth || '#e74c3c' },
            { vals: lips, color: p.colorLips || '#2ecc71' },
          ].forEach(({ vals, color }) => {
            const s = chart.addLineSeries({ color: color as string, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            s.setData(toLineData(activeBars, vals));
            overlaySeriesRef.current.push(s);
          });
          break;
        }
        default:
          break;
      }
    }
  }, [indicators]);

  const buildSubChartIndicators = useCallback((activeBars: OHLCVBar[]) => {
    destroySubCharts();
    if (!subContainerRef.current || activeBars.length === 0) return;

    const subIndicators = indicators.filter(ind => ind.visible && [
      'rsi', 'macd', 'stoch', 'stochrsi', 'cci', 'willr', 'mfi', 'roc', 'tsi', 'uo',
      'ao', 'trix', 'cmo', 'dpo', 'volume', 'obv', 'cmf', 'fi', 'vroc',
      'atr', 'hv', 'stddev', 'adx', 'aroon', 'vortex',
      'elderray', 'coppock', 'fisher', 'smcbias',
    ].includes(ind.defId));

    const closes = activeBars.map(b => b.close);

    for (const ind of subIndicators) {
      const p = ind.params;
      const chart = createSubChart(ind.id);
      if (!chart) continue;

      const subEl = subChartsRef.current.find(s => s.id === ind.id)?.el;
      if (subEl) subEl.style.height = '130px';
      chart.applyOptions({ height: 130 });

      switch (ind.defId) {
        case 'rsi': {
          const vals = calcRsi(closes, (p.period as number) || 14);
          const series = chart.addLineSeries({ color: (p.color as string) || '#9b59b6', lineWidth: 1, priceScaleId: 'right' });
          series.setData(toLineData(activeBars, vals));
          const ob = (p.overbought as number) || 70;
          const os = (p.oversold as number) || 30;
          series.createPriceLine({ price: ob, color: '#ef5350', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OB' });
          series.createPriceLine({ price: 50, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          series.createPriceLine({ price: os, color: '#26a69a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OS' });
          chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 }, autoScale: false, mode: 0 });
          chart.priceScale('right').applyOptions({ minimumWidth: 60 });
          break;
        }
        case 'macd': {
          const { macdLine, signalLine, histogram } = calcMacd(closes, (p.fast as number) || 12, (p.slow as number) || 26, (p.signal as number) || 9);
          const histSeries = chart.addHistogramSeries({ priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
          histSeries.setData(activeBars.map((b, i) => ({
            time: b.time as UTCTimestamp,
            value: histogram[i] ?? 0,
            color: (histogram[i] ?? 0) >= 0 ? '#26a69a' : '#ef5350',
          })).filter((_, i) => histogram[i] !== null));
          const macdSeries = chart.addLineSeries({ color: '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'right' });
          const signalSeries = chart.addLineSeries({ color: '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'right' });
          macdSeries.setData(toLineData(activeBars, macdLine));
          signalSeries.setData(toLineData(activeBars, signalLine));
          break;
        }
        case 'stoch': {
          const { k, d } = stochastic(activeBars, (p.kPeriod as number) || 14, (p.dPeriod as number) || 3, (p.smooth as number) || 3);
          const kSeries = chart.addLineSeries({ color: '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const dSeries = chart.addLineSeries({ color: '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          kSeries.setData(toLineData(activeBars, k));
          dSeries.setData(toLineData(activeBars, d));
          kSeries.createPriceLine({ price: 80, color: '#ef5350', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          kSeries.createPriceLine({ price: 20, color: '#26a69a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'stochrsi': {
          const { k, d } = stochasticRSI(closes, (p.rsiPeriod as number) || 14, (p.stochPeriod as number) || 14, (p.kSmooth as number) || 3, (p.dSmooth as number) || 3);
          const kS = chart.addLineSeries({ color: '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const dS = chart.addLineSeries({ color: '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          kS.setData(toLineData(activeBars, k));
          dS.setData(toLineData(activeBars, d));
          break;
        }
        case 'cci': {
          const vals = calcCci(activeBars, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#e67e22', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 100, color: '#ef5350', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          series.createPriceLine({ price: -100, color: '#26a69a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'willr': {
          const vals = williamsR(activeBars, (p.period as number) || 14);
          const series = chart.addLineSeries({ color: (p.color as string) || '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          break;
        }
        case 'mfi': {
          const vals = calcMfi(activeBars, (p.period as number) || 14);
          const series = chart.addLineSeries({ color: (p.color as string) || '#1abc9c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 80, color: '#ef5350', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          series.createPriceLine({ price: 20, color: '#26a69a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'roc': {
          const vals = roc(closes, (p.period as number) || 12);
          const series = chart.addLineSeries({ color: (p.color as string) || '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'tsi': {
          const vals = calcTsi(closes, (p.r as number) || 25, (p.s as number) || 13);
          const series = chart.addLineSeries({ color: (p.color as string) || '#9b59b6', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'uo': {
          const vals = ultimateOscillator(activeBars, (p.p1 as number) || 7, (p.p2 as number) || 14, (p.p3 as number) || 28);
          const series = chart.addLineSeries({ color: (p.color as string) || '#f39c12', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          break;
        }
        case 'ao': {
          const vals = awesomeOscillator(activeBars);
          const histSeries = chart.addHistogramSeries({ priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
          histSeries.setData(activeBars.map((b, i) => ({
            time: b.time as UTCTimestamp,
            value: vals[i] ?? 0,
            color: (vals[i] ?? 0) >= 0 ? '#26a69a' : '#ef5350',
          })).filter((_, i) => vals[i] !== null));
          break;
        }
        case 'trix': {
          const vals = trix(closes, (p.period as number) || 18);
          const series = chart.addLineSeries({ color: (p.color as string) || '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'cmo': {
          const vals = cmo(closes, (p.period as number) || 14);
          const series = chart.addLineSeries({ color: (p.color as string) || '#2ecc71', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'dpo': {
          const vals = dpo(closes, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'volume': {
          const series = chart.addHistogramSeries({ priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
          series.setData(activeBars.map((b, i) => ({
            time: b.time as UTCTimestamp,
            value: b.volume,
            color: b.close >= (i > 0 ? activeBars[i - 1].close : b.open) ? ((p.colorUp as string) || '#26a69a') + '99' : ((p.colorDown as string) || '#ef5350') + '99',
          })));
          break;
        }
        case 'obv': {
          const vals = obv(activeBars);
          const series = chart.addLineSeries({ color: (p.color as string) || '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(activeBars.map((b, i) => ({ time: b.time as UTCTimestamp, value: vals[i] })));
          break;
        }
        case 'cmf': {
          const vals = cmf(activeBars, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#2ecc71', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'fi': {
          const vals = forceIndex(activeBars, (p.period as number) || 13);
          const histSeries = chart.addHistogramSeries({ priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
          histSeries.setData(activeBars.map((b, i) => ({
            time: b.time as UTCTimestamp,
            value: vals[i] ?? 0,
            color: (vals[i] ?? 0) >= 0 ? '#26a69a' : '#ef5350',
          })).filter((_, i) => vals[i] !== null));
          break;
        }
        case 'vroc': {
          const vals = volumeROC(activeBars, (p.period as number) || 12);
          const series = chart.addLineSeries({ color: (p.color as string) || '#9b59b6', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'atr': {
          const vals = calcAtr(activeBars, (p.period as number) || 14);
          const series = chart.addLineSeries({ color: (p.color as string) || '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          break;
        }
        case 'hv': {
          const vals = historicalVolatility(closes, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          break;
        }
        case 'stddev': {
          const vals = standardDeviation(closes, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#f39c12', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          break;
        }
        case 'adx': {
          const { adx: adxVals, plusDI, minusDI } = calcAdx(activeBars, (p.period as number) || 14);
          const adxS = chart.addLineSeries({ color: '#f39c12', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const plusS = chart.addLineSeries({ color: '#26a69a', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const minusS = chart.addLineSeries({ color: '#ef5350', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          adxS.setData(toLineData(activeBars, adxVals));
          plusS.setData(toLineData(activeBars, plusDI));
          minusS.setData(toLineData(activeBars, minusDI));
          adxS.createPriceLine({ price: 25, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'aroon': {
          const { upper, lower, oscillator } = calcAroon(activeBars, (p.period as number) || 25);
          const upS = chart.addLineSeries({ color: '#26a69a', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const dnS = chart.addLineSeries({ color: '#ef5350', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const oscS = chart.addLineSeries({ color: '#f39c12', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          upS.setData(toLineData(activeBars, upper));
          dnS.setData(toLineData(activeBars, lower));
          oscS.setData(toLineData(activeBars, oscillator));
          break;
        }
        case 'vortex': {
          const { viPlus, viMinus } = calcVortex(activeBars, (p.period as number) || 14);
          const plusS = chart.addLineSeries({ color: '#26a69a', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const minusS = chart.addLineSeries({ color: '#ef5350', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          plusS.setData(toLineData(activeBars, viPlus));
          minusS.setData(toLineData(activeBars, viMinus));
          break;
        }
        case 'elderray': {
          const { bullPower, bearPower } = elderRayIndex(activeBars, (p.period as number) || 13);
          const bullS = chart.addHistogramSeries({ priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
          const bearS = chart.addHistogramSeries({ priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
          bullS.setData(toLineData(activeBars, bullPower).map(d => ({ ...d, color: '#26a69a' })));
          bearS.setData(toLineData(activeBars, bearPower).map(d => ({ ...d, color: '#ef5350' })));
          break;
        }
        case 'coppock': {
          const vals = coppockCurve(closes, (p.roc1 as number) || 11, (p.roc2 as number) || 14, (p.wma as number) || 10);
          const series = chart.addLineSeries({ color: (p.color as string) || '#9b59b6', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'fisher': {
          const { fisher: fisherVals, signal: sigVals } = fisherTransform(activeBars, (p.period as number) || 9);
          const fS = chart.addLineSeries({ color: '#3498db', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          const sS = chart.addLineSeries({ color: '#e74c3c', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          fS.setData(toLineData(activeBars, fisherVals));
          sS.setData(toLineData(activeBars, sigVals));
          fS.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        case 'smcbias': {
          const vals = smartMoneyBias(activeBars, (p.period as number) || 20);
          const series = chart.addLineSeries({ color: (p.color as string) || '#8e44ad', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
          series.setData(toLineData(activeBars, vals));
          series.createPriceLine({ price: 0, color: '#8b949e', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
          break;
        }
        default:
          break;
      }

      const label = chart.addLineSeries({ visible: false });
      try { chart.removeSeries(label); } catch {}
    }
  }, [indicators, createSubChart, destroySubCharts]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: CHART_BG }, textColor: CHART_TEXT, fontSize: 11 },
      grid: { vertLines: { color: CHART_GRID }, horzLines: { color: CHART_GRID } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#444', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#21262d' },
        horzLine: { color: '#444', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#21262d' },
      },
      rightPriceScale: { borderColor: CHART_BORDER, scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { borderColor: CHART_BORDER, timeVisible: true, secondsVisible: false, barSpacing: 6, minBarSpacing: 2 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true },
    });

    mainChartRef.current = chart;
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      syncTimeScale(chart);
      setSvgTick(n => n + 1);
    });

    // Drawing clicks — chart.subscribeClick is the only reliable way since
    // lightweight-charts stops propagation on its canvas mouse events.
    chart.subscribeClick(params => {
      const tool = drawingToolRef.current;
      if (tool === 'none' || !params.point) return;
      const series = mainSeriesRef.current;
      if (!series) return;
      const time = chart.timeScale().coordinateToTime(params.point.x) as UTCTimestamp | null;
      const price = series.coordinateToPrice(params.point.y);
      if (time === null || price === null) return;

      const addDrawing = (p2?: { time: UTCTimestamp; price: number }) => {
        const color = DRAW_COLORS[colorIndexRef.current % DRAW_COLORS.length];
        colorIndexRef.current++;
        drawingsRef.current = [...drawingsRef.current, {
          id: `${Date.now()}`,
          tool,
          color,
          p1: pendingP1Ref.current ?? { time, price },
          p2,
        }];
        pendingP1Ref.current = null;
        setSvgTick(n => n + 1);
      };

      if (tool === 'hline' || tool === 'vline') {
        addDrawing();
      } else if (tool === 'text') {
        const label = window.prompt('Label:') ?? '';
        if (!label) return;
        const color = DRAW_COLORS[colorIndexRef.current % DRAW_COLORS.length];
        colorIndexRef.current++;
        drawingsRef.current = [...drawingsRef.current, { id: `${Date.now()}`, tool, color, p1: { time, price }, label }];
        setSvgTick(n => n + 1);
      } else if (pendingP1Ref.current === null) {
        pendingP1Ref.current = { time, price };
        setSvgTick(n => n + 1);
      } else {
        addDrawing({ time, price });
      }
    });

    // Track mouse position (for drawing preview) + external crosshair callback
    chart.subscribeCrosshairMove(params => {
      if (drawingToolRef.current !== 'none' && params.point) {
        setMousePos({ x: params.point.x, y: params.point.y });
      } else {
        setMousePos(null);
      }
      if (onCrosshairMove) {
        const seriesData = params.seriesData;
        let price: number | null = null;
        if (seriesData.size > 0) {
          const first = seriesData.values().next().value as { close?: number; value?: number };
          price = first?.close ?? first?.value ?? null;
        }
        onCrosshairMove({ price, time: (params.time as number) ?? null });
      }
    });

    resizeObserverRef.current = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry && mainChartRef.current) {
        mainChartRef.current.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
      chart.remove();
      mainChartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || bars.length === 0) return;

    try { if (mainSeriesRef.current) chart.removeSeries(mainSeriesRef.current as ISeriesApi<'Candlestick'>); } catch {}
    overlaySeriesRef.current.forEach(s => { try { chart.removeSeries(s); } catch {} });
    overlaySeriesRef.current = [];

    const activeBars = chartType === 'heikinashi' ? heikinAshi(bars) : bars;
    const timeData = activeBars.map(b => ({ time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close }));

    let series;
    if (chartType === 'line') {
      series = chart.addLineSeries({ color: '#3498db', lineWidth: 2, priceScaleId: 'right' });
      series.setData(activeBars.map(b => ({ time: b.time as UTCTimestamp, value: b.close })));
    } else if (chartType === 'area') {
      series = chart.addAreaSeries({
        topColor: 'rgba(52,152,219,0.3)', bottomColor: 'rgba(52,152,219,0.0)',
        lineColor: '#3498db', lineWidth: 2, priceScaleId: 'right',
      });
      series.setData(activeBars.map(b => ({ time: b.time as UTCTimestamp, value: b.close })));
    } else if (chartType === 'bar') {
      series = chart.addBarSeries({ upColor: UP_COLOR, downColor: DOWN_COLOR, thinBars: false, priceScaleId: 'right' });
      series.setData(timeData);
    } else {
      series = chart.addCandlestickSeries({
        upColor: UP_COLOR, downColor: DOWN_COLOR,
        borderUpColor: UP_COLOR, borderDownColor: DOWN_COLOR,
        wickUpColor: UP_COLOR, wickDownColor: DOWN_COLOR,
        priceScaleId: 'right',
      } as DeepPartial<CandlestickSeriesOptions>);
      series.setData(timeData);
    }

    mainSeriesRef.current = series as ISeriesApi<'Candlestick'>;
    buildOverlayIndicators(chart, activeBars);
    buildSubChartIndicators(activeBars);
    chart.timeScale().fitContent();
  }, [bars, chartType, buildOverlayIndicators, buildSubChartIndicators]);

  useEffect(() => {
    if (!mainChartRef.current || bars.length === 0) return;
    const activeBars = chartType === 'heikinashi' ? heikinAshi(bars) : bars;
    buildOverlayIndicators(mainChartRef.current, activeBars);
    buildSubChartIndicators(activeBars);
  }, [indicators]);

  // Sync drawingToolRef and cancel pending on tool change
  useEffect(() => {
    drawingToolRef.current = drawingTool;
    pendingP1Ref.current = null;
    forceRedraw();
  }, [drawingTool, forceRedraw]);

  // Clear all drawings
  useEffect(() => {
    if (!clearDrawings) return;
    drawingsRef.current = [];
    pendingP1Ref.current = null;
    forceRedraw();
  }, [clearDrawings, forceRedraw]);

  // Undo last drawing
  useEffect(() => {
    if (!undoDrawing) return;
    drawingsRef.current = drawingsRef.current.slice(0, -1);
    forceRedraw();
  }, [undoDrawing, forceRedraw]);

  // Mouse event handlers for drawing — use chart's own event API (DOM click bubbling is blocked)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        pendingP1Ref.current = null;
        forceRedraw();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forceRedraw]);

  // Build SVG drawing elements
  const svgDrawings = (() => {
    const chart = mainChartRef.current;
    const series = mainSeriesRef.current;
    if (!chart || !series) return null;

    const px = (time: UTCTimestamp, price: number) => {
      const x = chart.timeScale().timeToCoordinate(time);
      const y = series.priceToCoordinate(price);
      return (x === null || y === null) ? null : { x, y };
    };

    const allDrawings = [...drawingsRef.current];

    // Add preview drawing while placing second point
    const pending = pendingP1Ref.current;
    const tool = drawingToolRef.current;
    if (pending && mousePos && tool !== 'none' && tool !== 'hline' && tool !== 'vline' && tool !== 'text') {
      const mp = px(pending.time, pending.price);
      if (mp) {
        const elements: JSX.Element[] = [
          <line key="preview-line" x1={mp.x} y1={mp.y} x2={mousePos.x} y2={mousePos.y}
            stroke={DRAW_COLOR} strokeWidth="1" strokeDasharray="5,4" opacity="0.7" />,
          <circle key="preview-dot" cx={mp.x} cy={mp.y} r="4" fill={DRAW_COLOR} opacity="0.8" />,
        ];
        if (tool === 'rectangle') {
          elements.push(
            <rect key="preview-rect"
              x={Math.min(mp.x, mousePos.x)} y={Math.min(mp.y, mousePos.y)}
              width={Math.abs(mousePos.x - mp.x)} height={Math.abs(mousePos.y - mp.y)}
              fill={`${DRAW_COLOR}18`} stroke={DRAW_COLOR} strokeWidth="1" strokeDasharray="5,4" opacity="0.7" />
          );
        }
        return <g key="previews">{elements}</g>;
      }
    }

    return allDrawings.map(d => {
      const p1 = px(d.p1.time, d.p1.price);
      if (!p1) return null;

      switch (d.tool) {
        case 'hline': return (
          <g key={d.id}>
            <line x1={0} y1={p1.y} x2={9999} y2={p1.y} stroke={d.color} strokeWidth="1" strokeDasharray="6,4" />
            <text x={6} y={p1.y - 4} fill={d.color} fontSize="10" fontFamily="monospace">{d.p1.price.toFixed(2)}</text>
          </g>
        );
        case 'vline': return (
          <line key={d.id} x1={p1.x} y1={0} x2={p1.x} y2={9999} stroke={d.color} strokeWidth="1" strokeDasharray="6,4" />
        );
        case 'text': return (
          <g key={d.id}>
            <circle cx={p1.x} cy={p1.y} r="3" fill={d.color} />
            <text x={p1.x + 6} y={p1.y + 4} fill={d.color} fontSize="12" fontFamily="sans-serif">{d.label}</text>
          </g>
        );
        case 'trendline': {
          if (!d.p2) return null;
          const p2 = px(d.p2.time, d.p2.price);
          if (!p2) return null;
          return (
            <g key={d.id}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={d.color} strokeWidth="1.5" />
              <circle cx={p1.x} cy={p1.y} r="3" fill={d.color} />
              <circle cx={p2.x} cy={p2.y} r="3" fill={d.color} />
            </g>
          );
        }
        case 'ray': {
          if (!d.p2) return null;
          const p2 = px(d.p2.time, d.p2.price);
          if (!p2) return null;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return null;
          const ext = 9999;
          return (
            <g key={d.id}>
              <line x1={p1.x} y1={p1.y} x2={p1.x + (dx / len) * ext} y2={p1.y + (dy / len) * ext} stroke={d.color} strokeWidth="1.5" />
              <circle cx={p1.x} cy={p1.y} r="3" fill={d.color} />
            </g>
          );
        }
        case 'rectangle': {
          if (!d.p2) return null;
          const p2 = px(d.p2.time, d.p2.price);
          if (!p2) return null;
          return (
            <rect key={d.id}
              x={Math.min(p1.x, p2.x)} y={Math.min(p1.y, p2.y)}
              width={Math.abs(p2.x - p1.x)} height={Math.abs(p2.y - p1.y)}
              fill={`${d.color}18`} stroke={d.color} strokeWidth="1.5" />
          );
        }
        case 'fibonacci': {
          if (!d.p2) return null;
          const p2 = px(d.p2.time, d.p2.price);
          if (!p2) return null;
          const priceRange = d.p1.price - d.p2.price;
          const xMin = Math.min(p1.x, p2.x);
          const xMax = Math.max(p1.x, p2.x);
          const fibColors = ['#3fb950', '#79c0ff', '#d29922', '#fff', '#d29922', '#79c0ff', '#f85149'];
          return (
            <g key={d.id}>
              {FIB_LEVELS.map((level, i) => {
                const fibPrice = d.p2!.price + priceRange * level;
                const fibPos = px(d.p1.time, fibPrice);
                if (!fibPos) return null;
                return (
                  <g key={level}>
                    <line x1={xMin} y1={fibPos.y} x2={xMax} y2={fibPos.y} stroke={fibColors[i]} strokeWidth="1" strokeDasharray={level === 0 || level === 1 ? 'none' : '4,3'} />
                    <text x={xMax + 4} y={fibPos.y + 4} fill={fibColors[i]} fontSize="9" fontFamily="monospace">{(level * 100).toFixed(1)}%</text>
                  </g>
                );
              })}
            </g>
          );
        }
        default: return null;
      }
    });
  })();

  // Suppress the svgTick lint warning — it's used to force SVG re-renders
  void svgTick;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: drawingTool !== 'none' ? 'crosshair' : 'default' }} />
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        >
          {svgDrawings}
        </svg>
      </div>
      <div ref={subContainerRef} style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }} />
    </div>
  );
}
