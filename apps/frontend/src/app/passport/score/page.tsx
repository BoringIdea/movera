'use client'

import { Header } from '@/components/header'
import { useState } from 'react'
import { TrendingUp, Zap } from 'lucide-react'
import { 
  usePassportOverviewBasic, 
  usePassportScoreHistory, 
  usePassportBadges, 
  usePassportActivity, 
  usePassportProtocols 
} from '@/hooks/usePassportData'

// Type definitions for better TypeScript support
interface ScoreHistoryPoint {
  date: string;
  score: number;
  breakdown?: any;
}

interface ActivityItem {
  action: string;
  protocol: string;
  amount: string;
  token: string;
  time: string;
  status: string;
  txHash: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  progress: number;
  earnedAt?: string;
}
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useChain } from '@/components/providers/chain-provider'
import { getExplorerTxUrl } from '@/utils/utils'

// Skeleton components for loading states
const ScoreSkeleton = () => (
  <div className="border border-black/40 bg-white px-4 py-4 space-y-3">
    <div className="h-5 bg-black/10 rounded w-32 animate-pulse" />
    <div className="flex items-center gap-4">
      <div className="h-10 bg-black/10 rounded w-20 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-black/10 rounded w-16 animate-pulse" />
        <div className="h-3 bg-black/10 rounded w-24 animate-pulse" />
      </div>
    </div>
    <div className="h-3 bg-black/10 rounded w-40 animate-pulse" />
  </div>
)

const StatsSkeleton = () => (
  <div className="border border-black/40 bg-white px-4 py-4 space-y-3">
    <div className="h-4 bg-black/10 rounded w-24 animate-pulse" />
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-3 bg-black/10 rounded w-20 animate-pulse" />
          <div className="h-3 bg-black/10 rounded w-10 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
)

const ChartSkeleton = () => (
  <div className="border border-black/40 bg-white px-4 py-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-black/10 rounded w-32 animate-pulse" />
      <div className="h-4 bg-black/10 rounded w-16 animate-pulse" />
    </div>
    <div className="h-48 bg-black/5 rounded animate-pulse" />
  </div>
)

const ActivitySkeleton = () => (
  <div className="border border-black/40 bg-white px-4 py-4 space-y-3">
    <div className="h-4 bg-black/10 rounded w-28 animate-pulse" />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 border border-black/10 rounded px-3 py-2">
          <div className="w-2 h-2 bg-black/20 rounded-full mt-1.5 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-black/10 rounded w-32 animate-pulse" />
            <div className="h-3 bg-black/10 rounded w-24 animate-pulse" />
          </div>
          <div className="h-3 bg-black/10 rounded w-12 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
)

const BadgesSkeleton = () => (
  <div className="border border-black/40 bg-white px-4 py-4 space-y-3">
    <div className="h-4 bg-black/10 rounded w-32 animate-pulse" />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-black/10 rounded px-3 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-black/10 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-black/10 rounded w-24 animate-pulse" />
            <div className="h-3 bg-black/10 rounded w-32 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const TipsSkeleton = () => (
  <div className="border border-black/40 bg-white px-4 py-4 space-y-3">
    <div className="h-4 bg-black/10 rounded w-32 animate-pulse" />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-4 h-4 bg-black/10 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-black/10 rounded w-32 animate-pulse" />
            <div className="h-3 bg-black/10 rounded w-48 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
)
export default function PassportScoreOptimizedPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const { currentChain } = useChain()
  
  // Get current wallet address based on chain
  const suiAccount = useCurrentAccount()
  const { account: aptosAccount } = useWallet()
  const currentUserAddress = currentChain === 'sui' ? suiAccount?.address : aptosAccount?.address
  
  // Use new lightweight hooks for progressive loading
  const { data: basicData, loading: basicLoading, error: basicError } = usePassportOverviewBasic(
    currentUserAddress || '', 
    currentChain || 'aptos'
  )
  
  const { data: scoreHistoryData, loading: scoreHistoryLoading, error: scoreHistoryError } = usePassportScoreHistory(
    currentUserAddress || '', 
    currentChain || 'aptos',
    selectedTimeRange
  )
  
  const { data: badgesData, loading: badgesLoading, error: badgesError } = usePassportBadges(
    currentUserAddress || '', 
    currentChain || 'aptos'
  )
  
  const { data: activityData, loading: activityLoading, error: activityError } = usePassportActivity(
    currentUserAddress || '', 
    currentChain || 'aptos',
    selectedTimeRange,
    5
  )
  
  const { data: protocolsData, loading: protocolsLoading, error: protocolsError } = usePassportProtocols(
    currentUserAddress || '', 
    currentChain || 'aptos'
  )

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-purple-600', bg: 'bg-purple-100' }
    if (score >= 80) return { grade: 'A', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 70) return { grade: 'B', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const grade = basicData ? getScoreGrade(basicData.score) : { grade: 'D', color: 'text-gray-600', bg: 'bg-gray-100' }
  const formatVolumeValue = (value?: number) => {
    if (value === undefined || value === null) return '$0'
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  const formatAddress = (address?: string) => {
    if (!address) return '—'
    const prefix = address.slice(0, 6)
    const suffix = address.slice(-4)
    return `${prefix}…${suffix}`
  }

  const quickStats = [
    { label: 'Protocols', value: basicData?.protocols ?? 0, emoji: '🧭', helper: 'tracked' },
    { label: 'Volume', value: formatVolumeValue(basicData?.volume), emoji: '💧', helper: '24h' },
    {
      label: 'Badges',
      value: `${basicData?.badges?.earned ?? 0}/${basicData?.badges?.total ?? 0}`,
      emoji: '🏅',
      helper: 'collected',
    },
    { label: 'Trades', value: '47', emoji: '📈', helper: 'latest' },
  ]

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="border border-black bg-[#F4F7FF] px-5 py-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[0.55rem] font-black uppercase tracking-[0.4em] text-black/50">Your on-chain reputation breakdown and history</p>
            <span className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/40">
              {currentChain?.toUpperCase() ?? 'CHAIN'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-black">Passport Score</h1>
          <div className="flex flex-wrap gap-4 text-sm text-black/60">
            <span>Wallet {formatAddress(currentUserAddress)}</span>
            <span>Attestation reputation</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <section className="border border-black bg-white px-5 py-5 space-y-3">
            {basicError ? (
              <div className="border border-black/40 bg-white px-4 py-3 text-sm text-red-700">
                Error loading score data: {basicError}
              </div>
            ) : basicData ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Current score</p>
                  <span className={`text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1 border border-black ${grade.bg} ${grade.color}`}>
                    Grade {grade.grade}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-black text-black">{basicData.score.toFixed(2)}</div>
                  <div className="flex flex-col text-sm text-black/60">
                    <span>Score snapshot</span>
                    <span>Last updated {basicData.lastUpdated ? new Date(basicData.lastUpdated).toLocaleString() : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-black/60">
                  <TrendingUp className="w-4 h-4 text-[#2792FF]" />
                  <span>Reliable reputation for attestations</span>
                </div>
              </>
            ) : (
              <ScoreSkeleton />
            )}
          </section>

          <section className="border border-black bg-white px-5 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Quick stats</p>
              <span className="text-[0.6rem] uppercase tracking-[0.3em] text-black/40">Summary</span>
            </div>
            {basicLoading ? (
              <StatsSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="border border-black px-3 py-2 space-y-1">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60 flex items-center gap-2">
                      <span>{stat.emoji}</span>
                      {stat.label}
                    </p>
                    <p className="text-xl font-black text-black">{stat.value}</p>
                    <p className="text-[0.65rem] text-black/40 uppercase tracking-[0.2em]">{stat.helper}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-6">
            <section className="border border-black bg-white px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Score history</p>
                <div className="flex gap-2 text-xs font-black uppercase tracking-[0.2em]">
                  {['24h', '7d', '30d', '90d'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setSelectedTimeRange(range)}
                      className={`px-3 py-1 border border-black text-[0.55rem] ${selectedTimeRange === range ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              {scoreHistoryError ? (
                <div className="border border-black/40 px-4 py-3 text-sm text-red-700">
                  Error loading history: {scoreHistoryError}
                </div>
              ) : scoreHistoryLoading ? (
                <ChartSkeleton />
              ) : scoreHistoryData ? (
                <div className="h-48 flex items-end gap-3">
                  {scoreHistoryData.scoreHistory && scoreHistoryData.scoreHistory.length > 0 ? (
                    scoreHistoryData.scoreHistory.map((point: ScoreHistoryPoint, index: number) => {
                      const height = Math.min(Math.max((Number(point.score) / 100) * 100, 10), 100)
                      return (
                        <div key={index} className="flex flex-col items-center gap-1">
                          <div className="w-6 bg-black" style={{ height: `${height}%` }} />
                          <span className="text-[0.6rem] text-black/40">
                            {new Date(point.date).getDate()}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex-1 border border-black/20 rounded px-4 py-8 text-center text-sm text-black/60">
                      No score data yet
                    </div>
                  )}
                </div>
              ) : (
                <ChartSkeleton />
              )}
            </section>

            <section className="border border-black bg-white px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">On-chain activity</p>
                <span className="text-[0.6rem] text-black/40">Latest 5 events</span>
              </div>
              {activityError ? (
                <div className="border border-black/40 px-4 py-3 text-sm text-red-700">
                  Activity load error: {activityError}
                </div>
              ) : activityLoading ? (
                <ActivitySkeleton />
              ) : activityData ? (
                <div className="space-y-3">
                  {activityData.recentActivity && activityData.recentActivity.length > 0 ? (
                    activityData.recentActivity.map((activity: ActivityItem, index: number) => (
                      <div key={index} className="border border-black px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between text-sm font-black text-black/70">
                          <span>🚀 {activity.action}</span>
                          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-black/40">{activity.status}</span>
                        </div>
                        <div className="text-xs text-black/50">{activity.amount} • {activity.token}</div>
                        <div className="text-[0.65rem] text-black/40 flex items-center justify-between">
                          <span>{activity.time}</span>
                          {activity.txHash ? (
                            <a
                              href={`${getExplorerTxUrl(currentChain)}/${activity.txHash}?network=mainnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline"
                            >
                              {activity.txHash.slice(0, 6)}...{activity.txHash.slice(-4)}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-black/50 text-center py-4">No activity available</div>
                  )}
                </div>
              ) : (
                <ActivitySkeleton />
              )}
            </section>

            {basicData && (
              <section className="border border-black bg-white px-5 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Factor breakdown</p>
                  <span className="text-[0.6rem] text-black/40">Components</span>
                </div>
                <div className="space-y-3">
                  {basicData.breakdown ? (
                    Object.entries(basicData.breakdown).map(([key, value], index: number) => {
                      const factorNames = {
                        longevity: { name: 'Longevity', description: 'Account age & activity' },
                        balance: { name: 'Balance', description: 'Holdings & liquidity' },
                        activity: { name: 'Activity', description: 'Frequency & streaks' },
                        diversity: { name: 'Diversity', description: 'Protocols engaged' },
                        volume: { name: 'Volume', description: 'Trading flow' },
                        complexity: { name: 'Complexity', description: 'Advanced interactions' },
                        social: { name: 'Social', description: 'Reputation & badges' },
                      }
                      const factor = factorNames[key as keyof typeof factorNames]
                      if (!factor) return null
                      const scoreValue = Number(value)
                      const fill = Math.min(Math.max(scoreValue, 0), 100)
                      return (
                        <div key={index} className="border border-black/30 px-3 py-3 space-y-1">
                          <div className="flex items-center justify-between text-sm font-black text-black">
                            <span>{factor.name}</span>
                            <span>{scoreValue.toFixed(1)}</span>
                          </div>
                          <div className="h-2 border border-black bg-[#F4F7FF]">
                            <div className="h-2 bg-[#2792FF]" style={{ width: `${fill}%` }} />
                          </div>
                          <p className="text-[0.65rem] text-black/40">{factor.description}</p>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-black/50 text-center py-4">No breakdown data available</div>
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="border border-black bg-white px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Badges & achievements</p>
                <span className="text-[0.6rem] text-black/40">Earned</span>
              </div>
              {badgesError ? (
                <div className="border border-black/40 px-4 py-3 text-sm text-red-700">
                  Badge load error: {badgesError}
                </div>
              ) : badgesLoading ? (
                <BadgesSkeleton />
              ) : badgesData ? (
                <div className="space-y-3">
                  {badgesData.badges && badgesData.badges.length > 0 ? (
                    badgesData.badges.map((badge: Badge) => (
                      <div
                        key={badge.id}
                        className={`border border-black/30 px-3 py-3 space-y-1 ${badge.earned ? 'bg-[#E2FFE1]' : 'bg-white'}`}
                      >
                        <div className="flex items-center justify-between text-sm font-black text-black">
                          <span>{badge.icon} {badge.name}</span>
                          <span className="text-[0.65rem] text-black/50">{badge.category}</span>
                        </div>
                        <p className="text-xs text-black/50">{badge.description}</p>
                        {!badge.earned && (
                          <div className="h-1 bg-black/10 rounded-full">
                            <div className="h-1 bg-[#2792FF]" style={{ width: `${badge.progress}%` }} />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-black/50 text-center py-4">No badges yet</div>
                  )}
                </div>
              ) : (
                <BadgesSkeleton />
              )}
            </section>

            <section className="border border-black bg-white px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Optimization tips</p>
                <span className="text-[0.6rem] text-black/40">Protocol focus</span>
              </div>
              {protocolsError ? (
                <div className="border border-black/40 px-4 py-3 text-sm text-red-700">
                  Tips load error: {protocolsError}
                </div>
              ) : protocolsLoading ? (
                <TipsSkeleton />
              ) : protocolsData ? (
                <div className="space-y-3">
                  {protocolsData.optimizationTips && protocolsData.optimizationTips.length > 0 ? (
                    protocolsData.optimizationTips.map((tip: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 text-sm text-black/70">
                        <Zap className="w-4 h-4 text-[#2792FF]" />
                        <div>{tip}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-black/50 text-center py-4">No tips available</div>
                  )}
                </div>
              ) : (
                <TipsSkeleton />
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
