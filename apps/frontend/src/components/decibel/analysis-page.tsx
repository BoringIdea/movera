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
      <div className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="mv-shell flex min-h-[calc(100vh-80px)] items-center justify-center">
          <div className="mv-panel max-w-xl px-8 py-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 text-[#b42318]">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="mv-kicker">Data Error</p>
            <h2 className="mv-heading mt-3">Failed to Load Market Data</h2>
            <p className="mv-copy mt-3">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
      
      <main className="mv-shell max-w-7xl py-8">
        <div className="mv-panel-muted mb-8 px-6 py-5">
          <p className="mv-kicker">Decibel</p>
          <h1 className="mv-title mt-3">Market Analysis</h1>
          <p className="mv-copy mt-3">Real-time market structure, trader behavior, and funding conditions for Decibel Perp DEX.</p>
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

