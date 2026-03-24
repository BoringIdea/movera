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
    <Card className="mv-panel p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="mv-heading text-[1.55rem]">Funding Rates</h3>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
          Updated every 8h
        </div>
      </div>

      <div className="space-y-6">
        {/* Highest Positive Rates */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#5f9bff]" />
            <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">Highest Positive</h4>
          </div>
          <div className="space-y-2">
            {topPositive.length === 0 ? (
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-black/35">No positive rates</div>
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
            <TrendingDown className="w-4 h-4 text-[#b42318]" />
            <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">Highest Negative</h4>
          </div>
          <div className="space-y-2">
            {topNegative.length === 0 ? (
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-black/35">No negative rates</div>
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
      <div className="mt-6 border-t border-black/10 pt-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Estimated APY (annualized)</div>
        <div className="grid grid-cols-2 gap-4">
          {topPositive[0] && (
            <div className="border border-[#d5e5ff] bg-[#eef5ff] p-3 text-center">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{topPositive[0].market_name}</div>
              <div className="mv-heading text-[1.55rem] text-[#1f4ea3]">
                +{(topPositive[0].funding_rate * 365 * 3 * 100).toFixed(2)}%
              </div>
            </div>
          )}
          {topNegative[0] && (
            <div className="border border-[#efc0b8] bg-[#fff2ef] p-3 text-center">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{topNegative[0].market_name}</div>
              <div className="mv-heading text-[1.55rem] text-[#b42318]">
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
    <div className="flex items-center justify-between border border-black/10 bg-[#fbfbf8] p-2 transition-colors hover:bg-white">
      <div className="flex items-center gap-3">
        <div className={`flex h-6 w-6 items-center justify-center border font-mono text-[10px] ${
          isPositive ? 'border-[#d5e5ff] bg-[#eef5ff] text-[#1f4ea3]' : 'border-[#efc0b8] bg-[#fff2ef] text-[#b42318]'
        }`}>
          {rank}
        </div>
        <span className="text-sm text-black">
          {market.market_name}
        </span>
      </div>
      <div className="text-right">
        <div className={`font-mono text-sm ${
          isPositive ? 'text-[#1f4ea3]' : 'text-[#b42318]'
        }`}>
          {(market.funding_rate * 100).toFixed(4)}%
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
          per 8h
        </div>
      </div>
    </div>
  );
}
