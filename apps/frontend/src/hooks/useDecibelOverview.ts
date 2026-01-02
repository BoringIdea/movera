'use client'

import { useState, useEffect } from 'react';

interface DecibelOverview {
  total24hVolume: number;
  totalOpenInterest: number;
  activeMarkets: number;
  totalMarkets: number;
  activeTraders: number;
  score?: number;
}

interface DecibelLeaderboardItem {
  score?: number;
  decibel_score?: number;
  realized_pnl?: number;
  roi?: number;
}

interface UseDecibelOverviewReturn {
  data: DecibelOverview | null;
  loading: boolean;
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_DECIBEL_API_URL || 'https://api.netna.aptoslabs.com/decibel';

export function useDecibelOverview(): UseDecibelOverviewReturn {
  const [data, setData] = useState<DecibelOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);

        // Parallel fetch basic data, only fetch the core metrics needed for the overview
        const [contextsResponse, leaderboardResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/asset_contexts`),
          fetch(`${API_BASE_URL}/api/v1/leaderboard?limit=100`)
        ]);

        if (!contextsResponse.ok) {
          throw new Error(`Failed to fetch contexts: ${contextsResponse.status}`);
        }

        const contexts = await contextsResponse.json();
        
        // Process leaderboard data (optional)
        type LeaderboardResponse = {
          total_count?: number;
          items?: DecibelLeaderboardItem[];
        };

        let leaderboardData: LeaderboardResponse = { total_count: 0, items: [] };
        if (leaderboardResponse.ok) {
          leaderboardData = (await leaderboardResponse.json()) as LeaderboardResponse;
        }

        if (!mounted) return;

        // Calculate basic metrics - only calculate the core data needed for the overview
        const contextsArray = Array.isArray(contexts) ? contexts : [];
        
        // API volume_24h returns token amounts, not USD values
        // Need to multiply by mark_price to get USD volume
        const total24hVolume = contextsArray.reduce((sum: number, ctx: any) => {
          const tokenVolume = ctx.volume_24h || 0;
          const price = ctx.mark_price || 0;
          return sum + (tokenVolume * price);
        }, 0);
        const totalOpenInterest = contextsArray.reduce((sum: number, ctx: any) => sum + (ctx.open_interest || 0), 0);
        const activeMarkets = contextsArray.filter((ctx: any) => ctx.volume_24h > 0).length;
        const totalMarkets = contextsArray.length;
        const activeTraders = leaderboardData.total_count || leaderboardData.items?.length || 0;

        const leaderboardScore =
          leaderboardData.items?.find((item) => typeof item.score === 'number')?.score ??
          leaderboardData.items?.find((item) => typeof item.decibel_score === 'number')?.decibel_score ??
          (leaderboardData.items && leaderboardData.items.length > 0
            ? leaderboardData.items.reduce((sum: number, item) => sum + (item.realized_pnl ?? item.roi ?? 0), 0) /
              leaderboardData.items.length
            : 0);

        setData({
          total24hVolume,
          totalOpenInterest,
          activeMarkets,
          totalMarkets,
          activeTraders,
          score: leaderboardScore,
        });
      } catch (err) {
        console.error('Error fetching Decibel overview:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchOverview();

    // Set automatic refresh (optional, low frequency)
    const interval = setInterval(fetchOverview, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}
