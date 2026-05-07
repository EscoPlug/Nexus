import {
  Minus, ArrowRight, Minus as HLine, AlignJustify,
  Triangle, Type, MousePointer, Move,
} from 'lucide-react';
import type { DrawingToolType } from '../../types';

interface Props {
  activeTool: DrawingToolType;
  onToolChange: (tool: DrawingToolType) => void;
}

const tools: { id: DrawingToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'none', icon: <MousePointer size={15} />, label: 'Cursor' },
  { id: 'trendline', icon: <Minus size={15} />, label: 'Trend Line' },
  { id: 'ray', icon: <ArrowRight size={15} />, label: 'Ray' },
  { id: 'hline', icon: <HLine size={15} style={{ transform: 'rotate(-90deg)' }} />, label: 'Horizontal Line' },
  { id: 'vline', icon: <AlignJustify size={15} />, label: 'Vertical Line' },
  { id: 'rectangle', icon: <Move size={15} />, label: 'Rectangle' },
  { id: 'fibonacci', icon: <Triangle size={15} />, label: 'Fibonacci Retracement' },
  { id: 'text', icon: <Type size={15} />, label: 'Text' },
];

export default function ChartToolbar({ activeTool, onToolChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2 px-1 bg-[#161b22] border-r border-[#21262d] w-8">
      {tools.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolChange(activeTool === tool.id ? 'none' : tool.id)}
          className={`w-6 h-6 flex items-center justify-center rounded transition-all ${
            activeTool === tool.id
              ? 'bg-[#1f6feb] text-white'
              : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
          }`}
        >
          {tool.icon}
        </button>
      ))}
      <div className="w-4 h-px bg-[#21262d] my-1" />
    </div>
  );
}
