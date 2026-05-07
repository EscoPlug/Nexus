import { ExternalLink, Newspaper, Clock } from 'lucide-react';
import { useNews } from '../../hooks/useChartData';

interface Props {
  symbol: string;
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() / 1000 - ts) / 60);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function NewsPanel({ symbol }: Props) {
  const { news, loading } = useNews(symbol);

  return (
    <div className="flex flex-col h-full bg-[#161b22] border-l border-[#21262d] w-64 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[#21262d]">
        <Newspaper size={12} className="text-[#8b949e]" />
        <span className="text-[#c9d1d9] text-xs font-semibold uppercase tracking-wider">News</span>
        <span className="text-[#8b949e] text-[10px] ml-auto">{symbol}</span>
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4 animate-pulse">
                <div className="h-3 bg-[#21262d] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#21262d] rounded w-full mb-1" />
                <div className="h-2 bg-[#21262d] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#8b949e]">
            <Newspaper size={24} className="mb-2 opacity-30" />
            <p className="text-xs">No news available</p>
          </div>
        ) : (
          <div className="divide-y divide-[#21262d]/50">
            {news.map(item => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-3 hover:bg-[#21262d]/50 transition-colors group"
              >
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-full h-20 object-cover rounded-md mb-2 opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <p className="text-[#c9d1d9] text-xs font-medium leading-snug mb-1.5 group-hover:text-white transition-colors line-clamp-3">
                  {item.title}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#8b949e]">
                    <Clock size={9} />
                    <span className="text-[10px]">{timeAgo(item.publishedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#8b949e]">
                    <span className="text-[10px] truncate max-w-24">{item.publisher}</span>
                    <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
