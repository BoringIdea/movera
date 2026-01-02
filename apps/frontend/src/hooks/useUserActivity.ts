'use client'

import { useEffect, useMemo, useState } from 'react';
import type { Market } from '@/components/analysis/markets-table';

type TradeHistoryItem = {
  account: string;
  market: string; // market_addr
  action: string;
  size: number;
  price: number;
  is_profit?: boolean;
  realized_pnl_amount?: number;
  fee_amount?: number;
  transaction_unix_ms: number;
};

type AccountOverview = {
  perp_equity_balance: number;
  unrealized_pnl: number;
  unrealized_funding_cost: number;
  cross_margin_ratio: number;
  maintenance_margin: number;
  cross_account_leverage_ratio: number;
};

export type ActivityEvent = {
  action: string;
  marketAddr: string;
  marketName: string;
  size: number;
  price: number;
  notionalUSD: number;
  realizedPnl?: number;
  fee?: number;
  timestamp: number;
};

export type TradingSummary = {
  totalTrades: number;
  winRatePct: number;
  avgNotionalUSD: number;
  bestTradePnl: number;
  worstTradePnl: number;
  totalFees: number;
};

export type VolumeByMarket = Array<{
  marketName: string;
  marketAddr: string;
  volumeUSD: number;
  percentage: number;
}>;

export type UseUserActivityReturn = {
  events: ActivityEvent[];
  summary: TradingSummary | null;
  account: AccountOverview | null;
  volumeByMarket: VolumeByMarket;
  isLoading: boolean;
  error: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_DECIBEL_API_URL || 'https://api.netna.aptoslabs.com/decibel';

export function useUserActivity(userAddress: string | undefined, markets: Market[]): UseUserActivityReturn {
  const [state, setState] = useState<UseUserActivityReturn>({
    events: [],
    summary: null,
    account: null,
    volumeByMarket: [],
    isLoading: true,
    error: null,
  });

  const marketAddrToName = useMemo(() => {
    const map = new Map<string, string>();
    markets.forEach((m) => map.set(m.market_addr, m.market_name));
    return map;
  }, [markets]);

  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      if (!userAddress) {
        setState((prev) => ({ ...prev, isLoading: false, error: null, events: [], summary: null, account: null, volumeByMarket: [] }));
        return;
      }
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const [tradesRes, accountRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/trade_history?user=${userAddress}&limit=200`, { headers: { 'Content-Type': 'application/json' } }),
          fetch(`${API_BASE_URL}/api/v1/account_overviews?user=${userAddress}`, { headers: { 'Content-Type': 'application/json' } }),
        ]);

        const tradesJson: TradeHistoryItem[] = tradesRes.ok ? await tradesRes.json() : [];
        let accountJson: AccountOverview | null = null;
        if (accountRes.ok) {
          accountJson = await accountRes.json();
        }

        // Normalize events
        const events: ActivityEvent[] = (Array.isArray(tradesJson) ? tradesJson : []).map((t) => {
          const notional = (t.size || 0) * (t.price || 0);
          return {
            action: t.action || 'Trade',
            marketAddr: t.market,
            marketName: marketAddrToName.get(t.market) || t.market,
            size: t.size || 0,
            price: t.price || 0,
            notionalUSD: notional,
            realizedPnl: t.realized_pnl_amount,
            fee: t.fee_amount,
            timestamp: t.transaction_unix_ms || Date.now(),
          };
        }).sort((a, b) => b.timestamp - a.timestamp);

        // Compute summary
        const totalTrades = events.length;
        const profitable = events.filter((e) => (e.realizedPnl || 0) > 0).length;
        const winRatePct = totalTrades > 0 ? Math.round((profitable / totalTrades) * 100) : 0;
        const totalNotional = events.reduce((sum, e) => sum + (e.notionalUSD || 0), 0);
        const avgNotionalUSD = totalTrades > 0 ? totalNotional / totalTrades : 0;
        const bestTradePnl = events.reduce((max, e) => Math.max(max, e.realizedPnl ?? -Infinity), -Infinity);
        const worstTradePnl = events.reduce((min, e) => Math.min(min, e.realizedPnl ?? Infinity), Infinity);
        const totalFees = events.reduce((sum, e) => sum + (e.fee || 0), 0);

        const summary: TradingSummary = {
          totalTrades,
          winRatePct,
          avgNotionalUSD,
          bestTradePnl: Number.isFinite(bestTradePnl) ? bestTradePnl : 0,
          worstTradePnl: Number.isFinite(worstTradePnl) ? worstTradePnl : 0,
          totalFees,
        };

        // Volume by market
        const volumeMap = new Map<string, number>();
        events.forEach((e) => {
          volumeMap.set(e.marketAddr, (volumeMap.get(e.marketAddr) || 0) + (e.notionalUSD || 0));
        });
        const totalVolume = Array.from(volumeMap.values()).reduce((s, v) => s + v, 0) || 1;
        const volumeByMarket: VolumeByMarket = Array.from(volumeMap.entries())
          .map(([addr, vol]) => ({
            marketAddr: addr,
            marketName: marketAddrToName.get(addr) || addr,
            volumeUSD: vol,
            percentage: (vol / totalVolume) * 100,
          }))
          .sort((a, b) => b.volumeUSD - a.volumeUSD)
          .slice(0, 6);

        if (!mounted) return;
        setState({
          events,
          summary,
          account: accountJson,
          volumeByMarket,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (!mounted) return;
        setState((prev) => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Failed to load user activity' }));
      }
    }

    fetchAll();

    const interval = setInterval(fetchAll, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userAddress, marketAddrToName]);

  return state;
}


