'use client'

import { Card } from '@/components/ui/card';
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
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  const bgColorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`${bgColorClasses[color]} p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].replace('bg-', 'text-')}`} />
        </div>
      </div>
    </Card>
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
