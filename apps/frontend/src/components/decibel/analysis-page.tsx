'use client'

import { Header } from '@/components/header';
import { 
  MetricsCards,
  MarketsTable,
  VolumeTrendChart,
  OIDistributionChart,
  LiveTradeFeed,
  FundingRatesWidget,
  LeaderboardWidget
} from '@/components/analysis';
import { useMarketData } from '@/hooks/useMarketData';
import { FullPageLoading } from '@/components/ui/loading-overlay';

export function DecibelAnalysisPage() {
  const { 
    platformMetrics, 
    markets, 
    volumeData,
    trades,
    leaderboard,
    isLoading, 
    error 
  } = useMarketData();

  if (isLoading) {
    return <FullPageLoading text="Loading Market Data" showHeader={true} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load Market Data</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Decibel Market Analysis
          </h1>
          <p className="text-gray-600">
            Real-time market data and analytics for Decibel Perp DEX
          </p>
        </div>

        <MetricsCards metrics={platformMetrics} />

        <div className="mb-8">
          <MarketsTable markets={markets} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <VolumeTrendChart data={volumeData} />
          <OIDistributionChart markets={markets} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <FundingRatesWidget markets={markets} />
          <LiveTradeFeed trades={trades} />
        </div>

        <LeaderboardWidget data={leaderboard} />
      </main>
    </div>
  );
}


