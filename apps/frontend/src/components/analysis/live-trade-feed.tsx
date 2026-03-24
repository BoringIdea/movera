'use client'

import { Activity } from 'lucide-react';

export interface Trade {
  market: string;
  marketName?: string;
  trader?: string;
  action: string;
  size: number;
  price: number;
  timestamp: number;
  is_profit?: boolean;
}

interface LiveTradeFeedProps {
  trades: Trade[];
}

export function LiveTradeFeed({ trades }: LiveTradeFeedProps) {
  const recentTrades = trades.slice(0, 15);

  return (
    <div className="mv-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="mv-heading text-xl">Live Trade Feed</h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse bg-[#5f9bff]" />
          <Activity className="h-5 w-5 text-black/35" />
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {recentTrades.length === 0 ? (
          <div className="py-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-black/35">
            No recent trades
          </div>
        ) : (
          recentTrades.map((trade, index) => (
            <TradeItem key={`${trade.timestamp}-${index}`} trade={trade} />
          ))
        )}
      </div>
    </div>
  );
}

function TradeItem({ trade }: { trade: Trade }) {
  const isLong = trade.action.toLowerCase().includes('long') || 
                 trade.action.toLowerCase().includes('buy');
  
  const timeAgo = getTimeAgo(trade.timestamp);
  const displayMarket = trade.marketName || trade.market.substring(0, 8) + '...';
  const displayTrader = trade.trader ? `${trade.trader.substring(0, 6)}...${trade.trader.substring(trade.trader.length - 4)}` : '';

  return (
    <div className="flex items-center justify-between border border-black/10 p-3 transition-colors hover:bg-white/72">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Direction indicator */}
        <div className={`h-10 w-1.5 flex-shrink-0 ${isLong ? 'bg-[#5f9bff]' : 'bg-[#b42318]'}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${isLong ? 'text-[#5f9bff]' : 'text-[#b42318]'}`}>
              {isLong ? '🟢 Long' : '🔴 Short'}
            </span>
            <span className="text-sm text-black">
              {displayMarket}
            </span>
          </div>
          <div className="text-xs text-black/50">
            {formatSize(trade.size)} @ ${formatPrice(trade.price)}
          </div>
          {displayTrader && (
            <div className="mt-1 font-mono text-xs text-black/35">
              {displayTrader}
            </div>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 ml-3">
        <div className="text-xs text-black/45">
          {timeAgo}
        </div>
        {trade.is_profit !== undefined && (
          <div className={`font-mono text-[10px] uppercase tracking-[0.16em] ${trade.is_profit ? 'text-[#5f9bff]' : 'text-black/40'}`}>
            {trade.is_profit ? '✓ Profit' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(size: number): string {
  if (size >= 1000) {
    return `${(size / 1000).toFixed(2)}K`;
  }
  return size.toFixed(2);
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return price.toFixed(2);
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  } else {
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
