'use client'

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';

export interface Market {
  market_name: string;
  market_addr: string;
  mark_price: number;
  price_change_24h: number;
  volume_24h: number;
  funding_rate: number;
  open_interest: number;
  price_history: number[];
}

interface MarketsTableProps {
  markets: Market[];
}

type SortKey = 'market_name' | 'mark_price' | 'price_change_24h' | 'volume_24h' | 'funding_rate' | 'open_interest';
type SortDirection = 'asc' | 'desc';

export function MarketsTable({ markets }: MarketsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('volume_24h');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedMarkets = useMemo(() => {
    return [...markets].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [markets, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">All Markets</h2>
        <div className="text-sm text-gray-500">
          Real-time data • {markets.length} markets
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <SortableHeader
                label="Market"
                sortKey="market_name"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Price"
                sortKey="mark_price"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="24h Change"
                sortKey="price_change_24h"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="24h Volume"
                sortKey="volume_24h"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Funding Rate"
                sortKey="funding_rate"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Open Interest"
                sortKey="open_interest"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                24h Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedMarkets.map((market) => (
              <MarketRow key={market.market_addr} market={market} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}

function SortableHeader({ label, sortKey, currentSortKey, sortDirection, onSort, align = 'left' }: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;
  
  return (
    <th
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )
        ) : (
          <ArrowUpDown className="w-4 h-4 opacity-30" />
        )}
      </div>
    </th>
  );
}

function MarketRow({ market }: { market: Market }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {renderMarketIcon(market.market_name)}
          <span className="font-semibold text-gray-900">{market.market_name}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-right font-medium text-gray-900">
        ${formatNumber(market.mark_price)}
      </td>
      <td className="px-4 py-4 text-right">
        <span className={`font-medium ${market.price_change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {market.price_change_24h >= 0 ? '↑' : '↓'} {Math.abs(market.price_change_24h).toFixed(2)}%
        </span>
      </td>
      <td className="px-4 py-4 text-right font-medium text-gray-900">
        ${formatCurrency(market.volume_24h * market.mark_price)}
      </td>
      <td className="px-4 py-4 text-right">
        <span className={`font-medium ${market.funding_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {(market.funding_rate * 100).toFixed(4)}%
        </span>
      </td>
      <td className="px-4 py-4 text-right font-medium text-gray-900">
        ${formatCurrency(market.open_interest)}
      </td>
      <td className="px-4 py-4 text-right">
        <MiniSparkline data={market.price_history} />
      </td>
    </tr>
  );
}

function renderMarketIcon(marketName: string) {
  // Try to extract base symbol, e.g., "APT" from "APT/USD" or "Equity.US.GLD/USD"
  const upper = marketName.toUpperCase();
  let symbol = upper;
  // Patterns: "SYMBOL/USD" or "CATEGORY.SUB.SYMBOL/USD"
  if (upper.includes('/')) {
    const left = upper.split('/')[0];
    const parts = left.split('.');
    symbol = parts[parts.length - 1];
  }

  // Map known symbols to local icons in public folder
  const iconMap: Record<string, string> = {
    'APT': '/aptos-logo.svg',
    'SUI': '/sui-logo.svg',
  };

  const iconSrc = iconMap[symbol];

  if (iconSrc) {
    return (
      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
        <Image src={iconSrc} alt={symbol} width={20} height={20} />
      </div>
    );
  }

  // Fallback: first letter avatar
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
      {symbol.charAt(0)}
    </div>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return <div className="w-16 h-8" />;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 30 - ((value - min) / range) * 28;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] >= data[0];
  
  return (
    <svg width="64" height="32" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#10b981' : '#ef4444'}
        strokeWidth="2"
      />
    </svg>
  );
}

function formatNumber(value: number): string {
  if (value >= 10000) {
    // For large prices (≥$10k), show 2 decimal places
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else if (value >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  } else if (value < 0.0001) {
    // For very small prices, show more decimal places
    return value.toFixed(8);
  } else if (value < 0.01) {
    // For small prices, show 6 decimal places
    return value.toFixed(6);
  }
  return value.toFixed(4);
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}
