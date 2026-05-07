import {
  MousePointer2, TrendingUp, ArrowUpRight, Minus,
  Square, Layers, Type, Trash2, Undo2,
} from 'lucide-react';
import type { DrawingToolType } from '../../types';

interface Props {
  activeTool: DrawingToolType;
  onToolChange: (tool: DrawingToolType) => void;
  onClearDrawings: () => void;
  onUndoDrawing: () => void;
}

const tools: { id: DrawingToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'none',       icon: <MousePointer2 size={14} />,  label: 'Cursor (no drawing)' },
  { id: 'trendline',  icon: <TrendingUp size={14} />,     label: 'Trend Line — click 2 points' },
  { id: 'ray',        icon: <ArrowUpRight size={14} />,   label: 'Ray — extends infinitely' },
  { id: 'hline',      icon: <Minus size={14} />,          label: 'Horizontal Line — click price' },
  { id: 'vline',      icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,2" />
      </svg>
    ), label: 'Vertical Line — click time' },
  { id: 'rectangle',  icon: <Square size={14} />,         label: 'Rectangle — click 2 corners' },
  { id: 'fibonacci',  icon: <Layers size={14} />,         label: 'Fibonacci Retracement — click high & low' },
  { id: 'text',       icon: <Type size={14} />,           label: 'Text Label — click to place' },
];

export default function ChartToolbar({ activeTool, onToolChange, onClearDrawings, onUndoDrawing }: Props) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2 px-1 bg-[#161b22] border-r border-[#21262d] w-9 flex-shrink-0">
      {tools.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolChange(activeTool === tool.id && tool.id !== 'none' ? 'none' : tool.id)}
          className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
            activeTool === tool.id
              ? 'bg-[#1f6feb] text-white'
              : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
          }`}
        >
          {tool.icon}
        </button>
      ))}

      <div className="w-5 h-px bg-[#21262d] my-1" />

      <button
        onClick={onUndoDrawing}
        title="Undo last drawing"
        className="w-7 h-7 flex items-center justify-center rounded text-[#8b949e] hover:text-[#d29922] hover:bg-[#21262d] transition-all"
      >
        <Undo2 size={13} />
      </button>
      <button
        onClick={onClearDrawings}
        title="Clear all drawings"
        className="w-7 h-7 flex items-center justify-center rounded text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] transition-all"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
