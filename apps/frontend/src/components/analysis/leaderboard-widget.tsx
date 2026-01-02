'use client'

import { Card } from '@/components/ui/card';
import { Trophy, TrendingUp } from 'lucide-react';

export interface LeaderboardEntry {
  rank: number;
  account: string;
  account_value: number;
  realized_pnl: number;
  roi: number;
  volume: number;
}

interface LeaderboardWidgetProps {
  data: LeaderboardEntry[];
}

export function LeaderboardWidget({ data }: LeaderboardWidgetProps) {
  const topTraders = data.slice(0, 10);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Top Traders</h3>
        </div>
        <div className="text-sm text-gray-500">
          By Realized PnL
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trader
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                PnL
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                ROI
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Volume
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {topTraders.map((entry) => (
              <LeaderboardRow key={entry.account} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
        <StatCard
          label="Avg ROI"
          value={`${(calculateAverage(topTraders.map(t => t.roi)) * 100).toFixed(2)}%`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Total PnL"
          value={`$${formatCurrency(topTraders.reduce((sum, t) => sum + t.realized_pnl, 0))}`}
          icon={<Trophy className="w-4 h-4" />}
        />
        <StatCard
          label="Total Volume"
          value={`$${formatCurrency(topTraders.reduce((sum, t) => sum + t.volume, 0))}`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>
    </Card>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-semibold text-sm">
          {getMedalEmoji(entry.rank)}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="font-mono text-sm text-gray-900">
          {maskAddress(entry.account)}
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <span className={`font-semibold ${entry.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {entry.realized_pnl >= 0 ? '+' : ''}${formatCurrency(entry.realized_pnl)}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <span className={`font-semibold ${entry.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {entry.roi >= 0 ? '+' : ''}{(entry.roi * 100).toFixed(2)}%
        </span>
      </td>
      <td className="px-4 py-4 text-right font-medium text-gray-900">
        ${formatCurrency(entry.volume)}
      </td>
    </tr>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-center mb-1 text-gray-500">
        {icon}
      </div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

function maskAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}
