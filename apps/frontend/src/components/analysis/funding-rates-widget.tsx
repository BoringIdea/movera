'use client'

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Market } from './markets-table';

interface FundingRatesWidgetProps {
  markets: Market[];
}

export function FundingRatesWidget({ markets }: FundingRatesWidgetProps) {
  // Sort by funding rate
  const sortedByRate = [...markets].sort((a, b) => b.funding_rate - a.funding_rate);
  
  const topPositive = sortedByRate.filter(m => m.funding_rate > 0).slice(0, 3);
  const topNegative = sortedByRate.filter(m => m.funding_rate < 0).slice(-3).reverse();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Funding Rates</h3>
        <div className="text-xs text-gray-500">
          Updated every 8h
        </div>
      </div>

      <div className="space-y-6">
        {/* Highest Positive Rates */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h4 className="text-sm font-semibold text-gray-700">Highest Positive</h4>
          </div>
          <div className="space-y-2">
            {topPositive.length === 0 ? (
              <div className="text-sm text-gray-400">No positive rates</div>
            ) : (
              topPositive.map((market, index) => (
                <FundingRateItem
                  key={market.market_addr}
                  market={market}
                  rank={index + 1}
                  type="positive"
                />
              ))
            )}
          </div>
        </div>

        {/* Highest Negative Rates */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h4 className="text-sm font-semibold text-gray-700">Highest Negative</h4>
          </div>
          <div className="space-y-2">
            {topNegative.length === 0 ? (
              <div className="text-sm text-gray-400">No negative rates</div>
            ) : (
              topNegative.map((market, index) => (
                <FundingRateItem
                  key={market.market_addr}
                  market={market}
                  rank={index + 1}
                  type="negative"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* APY Estimate */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">Estimated APY (annualized)</div>
        <div className="grid grid-cols-2 gap-4">
          {topPositive[0] && (
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">{topPositive[0].market_name}</div>
              <div className="text-lg font-bold text-green-600">
                +{(topPositive[0].funding_rate * 365 * 3 * 100).toFixed(2)}%
              </div>
            </div>
          )}
          {topNegative[0] && (
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">{topNegative[0].market_name}</div>
              <div className="text-lg font-bold text-red-600">
                {(topNegative[0].funding_rate * 365 * 3 * 100).toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface FundingRateItemProps {
  market: Market;
  rank: number;
  type: 'positive' | 'negative';
}

function FundingRateItem({ market, rank, type }: FundingRateItemProps) {
  const isPositive = type === 'positive';
  
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {rank}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {market.market_name}
        </span>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {(market.funding_rate * 100).toFixed(4)}%
        </div>
        <div className="text-xs text-gray-500">
          per 8h
        </div>
      </div>
    </div>
  );
}
