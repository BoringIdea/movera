'use client'

import { useEffect, useMemo, useState } from 'react';
import type { ActivityEvent, TradingSummary } from './useUserActivity';

export type TaskTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type TaskStatus = 'locked' | 'in_progress' | 'completed';
export type TaskSource = 'trade_history' | 'account_overviews' | 'portfolio_chart' | 'funding_rate_history' | 'leaderboard' | 'orders';

export interface Task {
  id: string;
  title: string;
  description: string;
  tier?: TaskTier;
  progress: number; // 0-100
  target: number | string;
  current: number | string;
  status: TaskStatus;
  source: TaskSource;
  beta?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: TaskTier;
  earned: boolean;
  earnedDate?: string;
}

interface UseUserTasksReturn {
  tasks: Task[];
  badges: Badge[];
  isLoading: boolean;
  error: string | null;
}

export function useUserTasks(
  userAddress: string | undefined,
  events: ActivityEvent[],
  summary: TradingSummary | null,
  account: any
): UseUserTasksReturn {
  const [state, setState] = useState<UseUserTasksReturn>({
    tasks: [],
    badges: [],
    isLoading: true,
    error: null,
  });

  // Calculate consecutive active days
  const consecutiveActiveDays = useMemo(() => {
    if (!events.length) return 0;
    
    const days = new Set<string>();
    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      days.add(date);
    });
    
    const sortedDays = Array.from(days).sort();
    let maxConsecutive = 0;
    let currentConsecutive = 1;
    
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentConsecutive++;
      } else {
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        currentConsecutive = 1;
      }
    }
    
    return Math.max(maxConsecutive, currentConsecutive);
  }, [events]);

  // Calculate unique markets count
  const uniqueMarketsCount = useMemo(() => {
    const markets = new Set(events.map(e => e.marketAddr));
    return markets.size;
  }, [events]);

  // Calculate total volume
  const totalVolume = useMemo(() => {
    return events.reduce((sum, e) => sum + (e.notionalUSD || 0), 0);
  }, [events]);

  // Calculate total fees
  const totalFees = useMemo(() => {
    return events.reduce((sum, e) => sum + (e.fee || 0), 0);
  }, [events]);

  // Calculate best trade
  const bestTrade = useMemo(() => {
    return events.reduce((max, e) => Math.max(max, e.realizedPnl || 0), 0);
  }, [events]);

  useEffect(() => {
    if (!userAddress) {
      setState({
        tasks: [],
        badges: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Define tasks based on available data
      const tasks: Task[] = [
        // First Trade
        {
          id: 'first_trade',
          title: 'First Trade',
          description: 'Complete your first trade on Decibel',
          progress: events.length > 0 ? 100 : 0,
          target: 1,
          current: events.length,
          status: events.length > 0 ? 'completed' : 'locked',
          source: 'trade_history',
        },
        
        // Volume Milestones
        {
          id: 'volume_1k',
          title: 'Volume Trader (Bronze)',
          description: 'Trade $1,000+ in total volume',
          progress: Math.min(100, (totalVolume / 1000) * 100),
          target: 1000,
          current: Math.round(totalVolume),
          status: totalVolume >= 1000 ? 'completed' : totalVolume > 0 ? 'in_progress' : 'locked',
          tier: 'bronze',
          source: 'trade_history',
        },
        {
          id: 'volume_10k',
          title: 'Volume Trader (Silver)',
          description: 'Trade $10,000+ in total volume',
          progress: Math.min(100, (totalVolume / 10000) * 100),
          target: 10000,
          current: Math.round(totalVolume),
          status: totalVolume >= 10000 ? 'completed' : totalVolume >= 1000 ? 'in_progress' : 'locked',
          tier: 'silver',
          source: 'trade_history',
        },
        {
          id: 'volume_100k',
          title: 'Volume Trader (Gold)',
          description: 'Trade $100,000+ in total volume',
          progress: Math.min(100, (totalVolume / 100000) * 100),
          target: 100000,
          current: Math.round(totalVolume),
          status: totalVolume >= 100000 ? 'completed' : totalVolume >= 10000 ? 'in_progress' : 'locked',
          tier: 'gold',
          source: 'trade_history',
        },
        
        // Markets Diversity
        {
          id: 'markets_3',
          title: 'Diversified Trader (Bronze)',
          description: 'Trade on 3+ different markets',
          progress: Math.min(100, (uniqueMarketsCount / 3) * 100),
          target: 3,
          current: uniqueMarketsCount,
          status: uniqueMarketsCount >= 3 ? 'completed' : uniqueMarketsCount > 0 ? 'in_progress' : 'locked',
          tier: 'bronze',
          source: 'trade_history',
        },
        {
          id: 'markets_5',
          title: 'Diversified Trader (Silver)',
          description: 'Trade on 5+ different markets',
          progress: Math.min(100, (uniqueMarketsCount / 5) * 100),
          target: 5,
          current: uniqueMarketsCount,
          status: uniqueMarketsCount >= 5 ? 'completed' : uniqueMarketsCount >= 3 ? 'in_progress' : 'locked',
          tier: 'silver',
          source: 'trade_history',
        },
        
        // Win Rate
        {
          id: 'winrate_50',
          title: 'Consistent Trader (Bronze)',
          description: 'Achieve 50%+ win rate',
          progress: summary ? Math.min(100, (summary.winRatePct / 50) * 100) : 0,
          target: 50,
          current: summary ? summary.winRatePct : 0,
          status: summary && summary.winRatePct >= 50 ? 'completed' : summary && summary.winRatePct > 0 ? 'in_progress' : 'locked',
          tier: 'bronze',
          source: 'trade_history',
        },
        {
          id: 'winrate_60',
          title: 'Consistent Trader (Silver)',
          description: 'Achieve 60%+ win rate',
          progress: summary ? Math.min(100, (summary.winRatePct / 60) * 100) : 0,
          target: 60,
          current: summary ? summary.winRatePct : 0,
          status: summary && summary.winRatePct >= 60 ? 'completed' : summary && summary.winRatePct >= 50 ? 'in_progress' : 'locked',
          tier: 'silver',
          source: 'trade_history',
        },
        
        // Best Trade
        {
          id: 'best_trade_100',
          title: 'Big Winner (Bronze)',
          description: 'Make a single trade profit of $100+',
          progress: Math.min(100, (bestTrade / 100) * 100),
          target: 100,
          current: Math.round(bestTrade),
          status: bestTrade >= 100 ? 'completed' : bestTrade > 0 ? 'in_progress' : 'locked',
          tier: 'bronze',
          source: 'trade_history',
        },
        {
          id: 'best_trade_500',
          title: 'Big Winner (Silver)',
          description: 'Make a single trade profit of $500+',
          progress: Math.min(100, (bestTrade / 500) * 100),
          target: 500,
          current: Math.round(bestTrade),
          status: bestTrade >= 500 ? 'completed' : bestTrade >= 100 ? 'in_progress' : 'locked',
          tier: 'silver',
          source: 'trade_history',
        },
        
        // Total Fees
        {
          id: 'fees_10',
          title: 'Active Trader (Bronze)',
          description: 'Pay $10+ in total fees',
          progress: Math.min(100, (totalFees / 10) * 100),
          target: 10,
          current: Math.round(totalFees),
          status: totalFees >= 10 ? 'completed' : totalFees > 0 ? 'in_progress' : 'locked',
          tier: 'bronze',
          source: 'trade_history',
        },
        
        // Consecutive Active Days
        {
          id: 'consecutive_3',
          title: 'Dedicated Trader (Bronze)',
          description: 'Trade for 3+ consecutive days',
          progress: Math.min(100, (consecutiveActiveDays / 3) * 100),
          target: 3,
          current: consecutiveActiveDays,
          status: consecutiveActiveDays >= 3 ? 'completed' : consecutiveActiveDays > 0 ? 'in_progress' : 'locked',
          tier: 'bronze',
          source: 'trade_history',
        },
        {
          id: 'consecutive_7',
          title: 'Dedicated Trader (Silver)',
          description: 'Trade for 7+ consecutive days',
          progress: Math.min(100, (consecutiveActiveDays / 7) * 100),
          target: 7,
          current: consecutiveActiveDays,
          status: consecutiveActiveDays >= 7 ? 'completed' : consecutiveActiveDays >= 3 ? 'in_progress' : 'locked',
          tier: 'silver',
          source: 'trade_history',
        },
      ];

      // Add account-based tasks if account data is available
      if (account) {
        tasks.push(
          {
            id: 'equity_1000',
            title: 'Capital Builder (Bronze)',
            description: 'Maintain $1,000+ equity',
            progress: Math.min(100, ((account.perp_equity_balance || 0) / 1000) * 100),
            target: 1000,
            current: Math.round(account.perp_equity_balance || 0),
            status: (account.perp_equity_balance || 0) >= 1000 ? 'completed' : (account.perp_equity_balance || 0) > 0 ? 'in_progress' : 'locked',
            tier: 'bronze',
            source: 'account_overviews',
          },
          {
            id: 'leverage_3x',
            title: 'Risk Manager (Bronze)',
            description: 'Keep leverage under 3x',
            progress: (account.cross_account_leverage_ratio || 0) <= 3 ? 100 : Math.max(0, 100 - ((account.cross_account_leverage_ratio || 0) - 3) * 20),
            target: 3,
            current: (account.cross_account_leverage_ratio || 0).toFixed(2),
            status: (account.cross_account_leverage_ratio || 0) <= 3 ? 'completed' : 'in_progress',
            tier: 'bronze',
            source: 'account_overviews',
          }
        );
      }

      // Generate badges based on completed tasks
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const badges: Badge[] = [
        {
          id: 'first_trade_badge',
          name: 'First Trade',
          description: 'Completed your first trade',
          icon: '🎯',
          tier: 'bronze',
          earned: completedTasks.some(t => t.id === 'first_trade'),
          earnedDate: completedTasks.some(t => t.id === 'first_trade') ? new Date().toISOString().split('T')[0] : undefined,
        },
        {
          id: 'volume_trader_bronze',
          name: 'Volume Trader (Bronze)',
          description: 'Traded $1,000+ in volume',
          icon: '💰',
          tier: 'bronze',
          earned: completedTasks.some(t => t.id === 'volume_1k'),
          earnedDate: completedTasks.some(t => t.id === 'volume_1k') ? new Date().toISOString().split('T')[0] : undefined,
        },
        {
          id: 'volume_trader_silver',
          name: 'Volume Trader (Silver)',
          description: 'Traded $10,000+ in volume',
          icon: '💎',
          tier: 'silver',
          earned: completedTasks.some(t => t.id === 'volume_10k'),
          earnedDate: completedTasks.some(t => t.id === 'volume_10k') ? new Date().toISOString().split('T')[0] : undefined,
        },
        {
          id: 'diversified_trader_bronze',
          name: 'Diversified Trader (Bronze)',
          description: 'Traded on 3+ markets',
          icon: '🌐',
          tier: 'bronze',
          earned: completedTasks.some(t => t.id === 'markets_3'),
          earnedDate: completedTasks.some(t => t.id === 'markets_3') ? new Date().toISOString().split('T')[0] : undefined,
        },
        {
          id: 'consistent_trader_bronze',
          name: 'Consistent Trader (Bronze)',
          description: 'Achieved 50%+ win rate',
          icon: '📈',
          tier: 'bronze',
          earned: completedTasks.some(t => t.id === 'winrate_50'),
          earnedDate: completedTasks.some(t => t.id === 'winrate_50') ? new Date().toISOString().split('T')[0] : undefined,
        },
      ];

      setState({
        tasks,
        badges,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState({
        tasks: [],
        badges: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to calculate tasks',
      });
    }
  }, [userAddress, events, summary, account, consecutiveActiveDays, uniqueMarketsCount, totalVolume, totalFees, bestTrade]);

  return state;
}
