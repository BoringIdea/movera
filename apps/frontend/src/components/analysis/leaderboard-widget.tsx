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
    <Card className="mv-panel p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#9a6700]" />
          <h3 className="mv-heading text-[1.55rem]">Top Traders</h3>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
          By Realized PnL
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10">
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                Rank
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                Trader
              </th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                PnL
              </th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                ROI
              </th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                Volume
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {topTraders.map((entry) => (
              <LeaderboardRow key={entry.account} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-black/10 pt-6">
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
    <tr className="transition-colors hover:bg-[#fbfbf8]">
      <td className="px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center border border-black/10 bg-[#fbfbf8] font-mono text-xs">
          {getMedalEmoji(entry.rank)}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="font-mono text-sm text-black">
          {maskAddress(entry.account)}
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <span className={`font-mono text-sm ${entry.realized_pnl >= 0 ? 'text-[#5f9bff]' : 'text-[#b42318]'}`}>
          {entry.realized_pnl >= 0 ? '+' : ''}${formatCurrency(entry.realized_pnl)}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <span className={`font-mono text-sm ${entry.roi >= 0 ? 'text-[#5f9bff]' : 'text-[#b42318]'}`}>
          {entry.roi >= 0 ? '+' : ''}{(entry.roi * 100).toFixed(2)}%
        </span>
      </td>
      <td className="px-4 py-4 text-right font-mono text-sm text-black">
        ${formatCurrency(entry.volume)}
      </td>
    </tr>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-black/10 bg-[#fbfbf8] p-3 text-center">
      <div className="mb-1 flex items-center justify-center text-black/45">
        {icon}
      </div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{label}</div>
      <div className="mv-heading text-[1.55rem]">{value}</div>
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
