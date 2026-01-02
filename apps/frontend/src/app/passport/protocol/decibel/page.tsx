'use client'

import { Header } from '@/components/header'
import { useMemo, useState } from 'react'
import { usePlatformMetrics, useMarkets, useVolumeData, useRecentTrades, useLeaderboard } from '@/hooks/useMarketDataOptimized'
import { useUserActivity } from '@/hooks/useUserActivity'
import { useUserTasks } from '@/hooks/useUserTasks'
import { useChain } from '@/components/providers/chain-provider'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { Shield } from 'lucide-react'
import { VolumeTrendChart } from '@/components/analysis/volume-trend-chart'
import { OIDistributionChart } from '@/components/analysis/oi-distribution-chart'
import { LiveTradeFeed } from '@/components/analysis/live-trade-feed'

type TabKey = 'analysis' | 'activity' | 'tasks'

type SortKey = 'volume' | 'realized_pnl' | 'roi'

type MetricCard = {
  label: string
  emoji: string
  value?: number | string
  color: string
}

const formatNumber = (value?: number) => {
  if (!value) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toFixed(0)
}

const metricsValue = (value?: number) => {
  if (!value) return '0'
  return formatNumber(value)
}

export default function DecibelProtocolOptimizedPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('analysis')
  const [sortBy, setSortBy] = useState<SortKey>('volume')

  const { data: platformMetrics, loading: isMetricsLoading, error: metricsError } = usePlatformMetrics()
  const { data: markets } = useMarkets()
  const { data: volumeData } = useVolumeData()
  const { data: trades } = useRecentTrades()
  const { data: leaderboard } = useLeaderboard()

  const { currentChain } = useChain()
  const suiAccount = useCurrentAccount()
  const { account: aptosAccount } = useWallet()
  const userAddress = currentChain === 'sui' ? suiAccount?.address : aptosAccount?.address

  const { events, summary, account } = useUserActivity(userAddress, markets || [])
  const { tasks, badges } = useUserTasks(userAddress, events, summary, account)

  const sortedMarkets = useMemo(() => {
    if (!markets) return []
    return [...markets].sort((a, b) => b.volume_24h - a.volume_24h).slice(0, 8)
  }, [markets])

  const positiveFunding = useMemo(() => {
    if (!markets) return []
    return [...markets].sort((a, b) => b.funding_rate - a.funding_rate).slice(0, 3)
  }, [markets])

  const negativeFunding = useMemo(() => {
    if (!markets) return []
    return [...markets].sort((a, b) => a.funding_rate - b.funding_rate).slice(0, 3)
  }, [markets])

  const totalPnl = useMemo(() => {
    return events.reduce((sum, event) => sum + (event.realizedPnl ?? 0), 0)
  }, [events])

  const totalLeaderboardPnl = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return 0
    return leaderboard.reduce((sum, entry) => sum + (entry.realized_pnl ?? 0), 0)
  }, [leaderboard])

  const totalVolumeComputed = useMemo(() => {
    return events.reduce((sum, event) => sum + (event.notionalUSD ?? 0), 0)
  }, [events])

  // Sort leaderboard by selected criteria
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return []
    return [...leaderboard].sort((a, b) => {
      let valueA: number
      let valueB: number
      
      switch (sortBy) {
        case 'realized_pnl':
          valueA = typeof a.realized_pnl === 'number' ? a.realized_pnl : 0
          valueB = typeof b.realized_pnl === 'number' ? b.realized_pnl : 0
          break
        case 'roi':
          valueA = typeof a.roi === 'number' ? a.roi : 0
          valueB = typeof b.roi === 'number' ? b.roi : 0
          break
        case 'volume':
        default:
          valueA = typeof a.volume === 'number' ? a.volume : 0
          valueB = typeof b.volume === 'number' ? b.volume : 0
          break
      }
      
      return valueB - valueA // Descending order
    })
  }, [leaderboard, sortBy])

  const avgRoi = useMemo(() => {
    if (summary?.winRatePct !== undefined && events.length > 0) {
      return summary.winRatePct
    }
    const totalNotional = events.reduce((sum, event) => sum + (event.notionalUSD ?? 0), 0)
    if (totalNotional > 0) {
      return (totalPnl / totalNotional) * 100
    }
    if (leaderboard && leaderboard.length > 0) {
      const avgLeaderboardRoi = leaderboard.reduce((sum, entry) => sum + (entry.roi ?? 0), 0) / leaderboard.length
      return avgLeaderboardRoi
    }
    return 0
  }, [events, totalPnl, summary, leaderboard])

  const totalPnlDisplay = events.length > 0 ? totalPnl : totalLeaderboardPnl
  const userVolume = totalVolumeComputed
  const totalVolumeDisplay = userVolume > 0 ? userVolume : platformMetrics?.total24hVolume ?? 0

  if (metricsError) {
    return (
      <div className="min-h-screen bg-[#F4F7FF] text-black">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <Shield className="w-16 h-16" />
            </div>
            <h2 className="text-xl font-semibold text-black mb-2">Failed to load Decibel data</h2>
            <p className="text-sm text-black/70">{metricsError}</p>
          </div>
        </div>
      </div>
    )
  }

  const metricCards: MetricCard[] = [
    { label: '24h Volume', emoji: '💧', value: platformMetrics?.total24hVolume, color: 'bg-[#E1F0FF]' },
    { label: 'Open Interest', emoji: '📈', value: platformMetrics?.totalOpenInterest, color: 'bg-[#E2FFE1]' },
    {
      label: 'Active Markets',
      emoji: '🧭',
      value: platformMetrics ? `${platformMetrics.activeMarkets}/${platformMetrics.totalMarkets}` : undefined,
      color: 'bg-[#FFF3DF]',
    },
    { label: 'Active Traders', emoji: '🧑‍💻', value: platformMetrics?.activeTraders, color: 'bg-[#F4E1FF]' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="max-w-6xl mx-auto space-y-6 px-4 py-8">
        <section className="border border-black bg-white px-6 py-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Decibel Protocol</p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-3xl font-black">Perp DEX analytics and insights</h1>
              <p className="text-sm font-bold text-black/60">On-chain metrics, snapshot events, and badges</p>
            </div>
            <span className="rounded-none border border-black bg-[#D0E8FF] px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-[#2792FF]">
              {currentChain?.toUpperCase() ?? 'CHAIN'}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          {(['analysis', 'activity', 'tasks'] as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`border border-black rounded-none px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                activeTab === key ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              {key}
            </button>
          ))}
        </section>

        {activeTab === 'analysis' && (
          <section className="border border-black bg-white px-6 py-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metricCards.map((card) => (
                <div key={card.label} className={`border border-black ${card.color} px-4 py-3 space-y-1`}>
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">
                    {card.emoji} {card.label}
                  </p>
                  <p className="text-xl font-black text-black">
                    {card.value !== undefined
                      ? typeof card.value === 'number'
                        ? card.label === 'Active Traders'
                          ? formatNumber(card.value)
                          : `$${formatNumber(card.value)}`
                        : card.value
                      : '—'}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="border border-black bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.2em]">All Markets</div>
              <div className="overflow-x-auto">
                <table className="w-full border border-black text-left text-xs uppercase tracking-[0.2em]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="px-3 py-2">Market</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">24h Change</th>
                      <th className="px-3 py-2 text-right">24h Volume</th>
                      <th className="px-3 py-2 text-right">Funding</th>
                      <th className="px-3 py-2 text-right">Open Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMarkets.map((market) => (
                      <tr key={market.market_addr} className="border-b border-black text-sm">
                        <td className="px-3 py-2 font-black">{market.market_name}</td>
                        <td className="px-3 py-2 text-right">${market.mark_price.toFixed(2)}</td>
                        <td
                          className={`px-3 py-2 text-right font-black ${
                            market.price_change_24h >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {market.price_change_24h >= 0 ? '▲' : '▼'} {Math.abs(market.price_change_24h).toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right">${(market.volume_24h * market.mark_price).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-green-600">{(market.funding_rate * 100).toFixed(4)}%</td>
                        <td className="px-3 py-2 text-right">${market.open_interest.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-black px-4 py-4 space-y-2 bg-[#F4F7FF]">
                <div className="flex items-center justify-between">
                  {/* <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">24h Volume Trend</p> */}
                  {/* <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Total ${volumeData?.reduce((sum, point) => sum + (point.volume || 0), 0)?.toLocaleString() ?? '0'}</p> */}
                </div>
                <VolumeTrendChart data={volumeData || []} />
              </div>
              <div className="border border-black px-4 py-4 space-y-2 bg-[#F4F7FF]">
                <div className="flex items-center justify-between">
                  {/* <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Open Interest Distribution</p> */}
                  {/* <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Total ${metricsValue(platformMetrics?.totalOpenInterest)}</p> */}
                </div>
                <OIDistributionChart markets={markets || []} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-black px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Funding Rates</p>
                <span className="text-xs text-black/40">Updated 8h</span>
              </div>
                {positiveFunding.length === 0 ? (
                  <p className="text-xs text-black/60">No data</p>
                ) : (
                  positiveFunding.map((market) => (
                    <div key={market.market_addr} className="flex items-center justify-between text-sm">
                      <span>{market.market_name}</span>
                      <span className="text-green-600">{(market.funding_rate * 100).toFixed(4)}%</span>
                    </div>
                  ))
                )}
                <div className="pt-3 border-t border-black/10">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Highest negative</p>
                  {negativeFunding.length === 0 ? (
                    <p className="text-xs text-black/60">None</p>
                  ) : (
                    negativeFunding.map((market) => (
                      <div key={market.market_addr} className="flex items-center justify-between text-sm">
                        <span>{market.market_name}</span>
                        <span className="text-red-600">{(market.funding_rate * 100).toFixed(4)}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="border border-black px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Live Trade Feed</p>
                  <span className="text-xs text-black/40">{trades?.length ? `${trades.length} trades` : 'No data'}</span>
                </div>
                {trades && trades.length > 0 ? (
                  (trades || []).slice(0, 6).map((trade, index) => {
                    const isLong = trade.action?.toLowerCase().includes('long') || trade.action?.toLowerCase() === 'buy';
                    const timeAgo = trade.timestamp 
                      ? `${Math.floor((Date.now() - trade.timestamp) / 60000)}m ago`
                      : 'Just now';
                    return (
                      <div 
                        key={`${trade.timestamp}-${trade.market}-${index}`} 
                        className="border border-black/30 rounded-none px-3 py-2 text-xs font-black uppercase tracking-[0.1em] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`${isLong ? 'text-green-600' : 'text-red-600'}`}>
                            {isLong ? '▲' : '▼'}
                          </span>
                          <span className="text-black/80 truncate">{trade.marketName || trade.market}</span>
                        </div>
                        <div className="flex items-center gap-2 text-black/60">
                          <span className="text-[0.65rem]">{trade.action || 'Trade'}</span>
                          {trade.price > 0 && (
                            <span className="text-[0.65rem]">@ ${trade.price.toFixed(2)}</span>
                          )}
                          <span className="text-[0.65rem]">{timeAgo}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-black/60">Loading trades...</p>
                )}
              </div>
            </div>

            <section className="border border-black px-4 py-4 space-y-3">
              <header className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Top Traders</p>
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-black/40">Sort by:</span>
                  <div className="flex gap-1">
                    {(['volume', 'realized_pnl', 'roi'] as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSortBy(key)}
                        className={`px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.2em] border border-black transition-colors ${
                          sortBy === key
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-black/5'
                        }`}
                      >
                        {key === 'realized_pnl' ? 'PnL' : key === 'roi' ? 'ROI' : 'Volume'}
                      </button>
                    ))}
                  </div>
                </div>
              </header>
              <div className="overflow-x-auto">
                <div className="max-h-[450px] overflow-y-auto">
                  <table className="w-full text-xs uppercase tracking-[0.15em]">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-black text-[0.6rem] text-black/50">
                        <th className="px-2 py-2 text-left bg-white">Rank</th>
                        <th className="px-2 py-2 text-left bg-white">Trader</th>
                        <th 
                          className={`px-2 py-2 text-right cursor-pointer hover:text-black/70 bg-white ${sortBy === 'realized_pnl' ? 'text-black font-black' : ''}`}
                          onClick={() => setSortBy('realized_pnl')}
                        >
                          PnL {sortBy === 'realized_pnl' ? '▼' : ''}
                        </th>
                        <th 
                          className={`px-2 py-2 text-right cursor-pointer hover:text-black/70 bg-white ${sortBy === 'roi' ? 'text-black font-black' : ''}`}
                          onClick={() => setSortBy('roi')}
                        >
                          ROI {sortBy === 'roi' ? '▼' : ''}
                        </th>
                        <th 
                          className={`px-2 py-2 text-right cursor-pointer hover:text-black/70 bg-white ${sortBy === 'volume' ? 'text-black font-black' : ''}`}
                          onClick={() => setSortBy('volume')}
                        >
                          Volume {sortBy === 'volume' ? '▼' : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLeaderboard.map((entry, index) => {
                      const addr =
                        entry.account ??
                        'Unknown';
                      const pnl = typeof entry.realized_pnl === 'number' ? entry.realized_pnl : 0;
                      const roi = typeof entry.roi === 'number' ? entry.roi : 0;
                      const vol = typeof entry.volume === 'number' ? entry.volume : 0;
                      return (
                        <tr key={`${addr}-${index}`} className="border-b border-black/10 text-sm">
                          <td className="px-2 py-2 font-black text-black/70">{index + 1}</td>
                          <td className="px-2 py-2 font-black">
                            {addr && addr.length > 11 ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : addr}
                          </td>
                          <td
                            className={`px-2 py-2 text-right font-black ${
                              pnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-2 py-2 text-right font-black ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {roi >= 0 ? '+' : '-'}{Math.abs(roi).toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-right font-black text-black/70">
                            ${formatNumber(vol)}
                          </td>
                        </tr>
                      )
                    })}
                    {sortedLeaderboard.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-4 text-xs text-black/60 text-center">
                          Loading leaderboard...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </section>
          </section>
        )}
        {activeTab === 'analysis' && (
          <section className="grid gap-4 lg:grid-cols-3 border border-black bg-white px-6 py-5">
            <div className="border border-black px-4 py-4 bg-[#F4F7FF] space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/60">Avg ROI</p>
              <p className={`text-xl font-black ${avgRoi >= 0 ? 'text-green-600' : 'text-red-600'}`}>{avgRoi.toFixed(2)}%</p>
            </div>
            <div className="border border-black px-4 py-4 bg-[#F4F7FF] space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/60">Total PnL</p>
              <p className={`text-xl font-black ${totalPnlDisplay >= 0 ? 'text-green-600' : 'text-red-600'}`}>${formatNumber(Math.abs(totalPnlDisplay))}</p>
            </div>
            <div className="border border-black px-4 py-4 bg-[#F4F7FF] space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/60">Total Volume</p>
              <p className="text-xl font-black text-black">${formatNumber(totalVolumeDisplay)}</p>
            </div>
          </section>
        )}

        {activeTab === 'activity' && (
          <section className="border border-black bg-white px-6 py-5 space-y-4">
            {!userAddress ? (
              <div className="border border-black px-4 py-4 text-xs font-black uppercase tracking-[0.2em] text-black/60">
                Connect your wallet to see on-chain activity.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border border-black px-4 py-4 space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Account Overview</p>
                  <p className="text-lg font-black text-black">{summary?.totalTrades ?? '—'}</p>
                  <p className="text-xs text-black/60">Win rate {summary?.winRatePct?.toFixed(0) ?? '—'}%</p>
                </div>
                {(events || []).slice(0, 5).map((event) => (
                  <div key={event.timestamp} className="border border-black px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-black/70 flex items-center justify-between">
                    <span>🚀 {event.action}</span>
                    <span>{event.marketName}</span>
                  </div>
                ))}
                {!events?.length && (
                  <div className="border border-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black/50">
                    No recent events
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'tasks' && (
          <section className="border border-black bg-white px-6 py-5 space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Tasks & Badges</p>
            {(badges || []).map((badge) => (
              <div key={badge.id} className="border border-black px-4 py-3 rounded-none text-sm font-black uppercase tracking-[0.2em] text-black/70 flex items-center justify-between">
                <span>✨ {badge.name}</span>
                <span className="text-[0.6rem] font-bold text-black/40">{badge.description}%</span>
              </div>
            ))}
            {!badges?.length && (
              <div className="border border-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black/50">
                No badges yet
              </div>
            )}
            {tasks?.slice(0, 3).map((task) => (
              <div key={task.id} className="border border-black px-4 py-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-black/60">
                  <span>{task.tier ?? 'bronze'}</span>
                  <span>{task.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm font-black text-black">{task.title}</p>
                <p className="text-xs text-black/60">{task.description}</p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
