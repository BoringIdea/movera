'use client'

import { TrendingUp, TrendingDown, DollarSign, Activity, Grid, Users } from 'lucide-react';

interface PlatformMetrics {
  total24hVolume: number;
  volumeChange24h: number;
  totalOpenInterest: number;
  oiChange24h: number;
  activeMarkets: number;
  totalMarkets: number;
  activeTraders: number;
  tradersChange24h: number;
}

interface MetricsCardsProps {
  metrics: PlatformMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards: MetricCardProps[] = [
    {
      title: '24h Trading Volume',
      value: formatCurrency(metrics.total24hVolume),
      icon: DollarSign,
      color: 'blue' as const,
    },
    {
      title: 'Total Open Interest',
      value: formatCurrency(metrics.totalOpenInterest),
      icon: Activity,
      color: 'green' as const,
    },
    {
      title: 'Active Markets',
      value: metrics.activeMarkets,
      subtitle: `of ${metrics.totalMarkets} total`,
      icon: Grid,
      color: 'purple' as const,
    },
    {
      title: 'Active Traders',
      value: metrics.activeTraders,
      icon: Users,
      color: 'orange' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <MetricCard key={index} {...card} />
      ))}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, change, subtitle, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-[#5f9bff]',
    green: 'text-[#5f9bff]',
    purple: 'text-[#5f9bff]',
    orange: 'text-[#5f9bff]',
  };

  const bgColorClasses = {
    blue: 'bg-[#eef5ff]',
    green: 'bg-[rgba(245,249,255,0.92)]',
    purple: 'bg-[#eef5ff]',
    orange: 'bg-[rgba(245,249,255,0.92)]',
  };

  return (
    <div className="mv-panel p-6 transition-colors hover:bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="mv-kicker mb-1">{title}</p>
          <h3 className="mv-heading mb-1 text-2xl">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-[#5f9bff]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[#b42318]" />
              )}
              <span className={`font-mono text-[11px] ${change >= 0 ? 'text-[#5f9bff]' : 'text-[#b42318]'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          )}
          {subtitle && (
            <p className="text-sm text-black/50">{subtitle}</p>
          )}
        </div>
        <div className={`${bgColorClasses[color]} border border-black/10 p-3`}>
          <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}
