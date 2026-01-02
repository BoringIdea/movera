'use client'

import { Card } from '@/components/ui/card';
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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Live Trade Feed</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <Activity className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {recentTrades.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No recent trades
          </div>
        ) : (
          recentTrades.map((trade, index) => (
            <TradeItem key={`${trade.timestamp}-${index}`} trade={trade} />
          ))
        )}
      </div>
    </Card>
  );
}

function TradeItem({ trade }: { trade: Trade }) {
  const isLong = trade.action.toLowerCase().includes('long') || 
                 trade.action.toLowerCase().includes('buy');
  
  const timeAgo = getTimeAgo(trade.timestamp);
  const displayMarket = trade.marketName || trade.market.substring(0, 8) + '...';
  const displayTrader = trade.trader ? `${trade.trader.substring(0, 6)}...${trade.trader.substring(trade.trader.length - 4)}` : '';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Direction indicator */}
        <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${isLong ? 'bg-green-500' : 'bg-red-500'}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${isLong ? 'text-green-600' : 'text-red-600'}`}>
              {isLong ? '🟢 Long' : '🔴 Short'}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {displayMarket}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {formatSize(trade.size)} @ ${formatPrice(trade.price)}
          </div>
          {displayTrader && (
            <div className="text-xs text-gray-400 font-mono mt-1">
              {displayTrader}
            </div>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 ml-3">
        <div className="text-xs text-gray-500">
          {timeAgo}
        </div>
        {trade.is_profit !== undefined && (
          <div className={`text-xs font-medium ${trade.is_profit ? 'text-green-600' : 'text-gray-500'}`}>
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
