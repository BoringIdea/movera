'use client'

import { useState, useEffect, useRef } from 'react';

// Type definitions
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

export interface Market {
  market_name: string;
  market_addr: string;
  mark_price: number;
  price_change_24h: number;
  volume_24h: number;
  funding_rate: number;
  open_interest: number;
  price_history: number[];
}

export interface VolumeData {
  hour: string;
  volume: number;
  timestamp: number;
}

export interface Trade {
  market: string;
  marketName: string;
  trader: string;
  action: string;
  size: number;
  price: number;
  timestamp: number;
  is_profit?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  account: string;
  account_value: number;
  realized_pnl: number;
  roi: number;
  volume: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_DECIBEL_API_URL || 'https://api.netna.aptoslabs.com/decibel';

// ========== 轻量级hooks用于渐进式加载 ==========

/**
 * 获取平台基本指标（最快加载）
 */
export function usePlatformMetrics() {
  const [data, setData] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchMetrics = async () => {
      try {
        // 并行获取市场上下文和排行榜数据来计算基本指标
        const [contextsResponse, leaderboardResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/asset_contexts`),
          fetch(`${API_BASE_URL}/api/v1/leaderboard?limit=100`)
        ]);
        
        if (!contextsResponse.ok) {
          throw new Error(`Failed to fetch contexts: ${contextsResponse.status}`);
        }
        
        const contexts = await contextsResponse.json();
        let leaderboardData = { total_count: 0, items: [] };
        
        // 获取排行榜数据来计算活跃交易者数量
        if (leaderboardResponse.ok) {
          leaderboardData = await leaderboardResponse.json();
        }
        
        // 计算基本指标
        // API volume_24h returns token amounts, not USD values
        // Need to multiply by mark_price to get USD volume
        const total24hVolume = contexts.reduce((sum: number, ctx: any) => {
          const tokenVolume = ctx.volume_24h || 0;
          const price = ctx.mark_price || 0;
          return sum + (tokenVolume * price);
        }, 0);
        
        const totalOpenInterest = contexts.reduce((sum: number, ctx: any) => sum + (ctx.open_interest || 0), 0);
        const activeMarkets = contexts.filter((ctx: any) => ctx.volume_24h > 0).length;
        
        // 使用排行榜的total_count作为活跃交易者数量
        const activeTraders = leaderboardData.total_count || leaderboardData.items?.length || 0;
        
        setData({
          total24hVolume,
          volumeChange24h: 0, // TODO: Calculate from historical data
          totalOpenInterest,
          oiChange24h: 0, // TODO: Calculate from historical data
          activeMarkets,
          totalMarkets: contexts.length,
          activeTraders,
          tradersChange24h: 0, // TODO: Calculate from historical data
        });
      } catch (err) {
        console.error('Error fetching platform metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { data, loading, error };
}

/**
 * 获取市场列表（第二优先级）
 */
export function useMarkets() {
  const [data, setData] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchMarkets = async () => {
      try {
        const [contextsResponse, marketsResponse, pricesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/asset_contexts`),
          fetch(`${API_BASE_URL}/api/v1/markets`),
          fetch(`${API_BASE_URL}/api/v1/prices`)
        ]);

        if (!contextsResponse.ok || !marketsResponse.ok) {
          throw new Error('Failed to fetch market data');
        }

        const [contexts, marketsInfo, pricesData] = await Promise.all([
          contextsResponse.json(),
          marketsResponse.json(),
          pricesResponse.ok ? pricesResponse.json() : []
        ]);

        // Merge data - use the same field mapping as the original version
        const markets: Market[] = contexts.map((ctx: any) => {
          const marketInfo = marketsInfo.find((m: any) => m.market_name === ctx.market);
          const priceInfo = pricesData.find((p: any) => p.market === marketInfo?.market_addr);
          
          return {
            market_name: ctx.market || marketInfo?.market_name || 'Unknown',
            market_addr: ctx.market || marketInfo?.market_addr || '',
            mark_price: ctx.mark_price || 0,
            price_change_24h: ctx.price_change_pct_24h || 0,
            volume_24h: ctx.volume_24h || 0,
            funding_rate: priceInfo ? (priceInfo.funding_rate_bps || 0) / 10000 : 0, // Convert bps to decimal
            open_interest: ctx.open_interest || 0,
            price_history: ctx.price_history || []
          };
        });

        setData(markets);
      } catch (err) {
        console.error('Error fetching markets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  return { data, loading, error };
}

/**
 * Fetch volume data (third priority)
 */
export function useVolumeData() {
  const [data, setData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchVolumeData = async () => {
      try {
        // Fetch market data to get candlestick data
        const marketsResponse = await fetch(`${API_BASE_URL}/api/v1/markets`);
        if (!marketsResponse.ok) {
          throw new Error('Failed to fetch markets');
        }
        
        const marketsArray = await marketsResponse.json();
        
        // Fetch real 24-hour trading volume data
        const volumeData = await fetchHourlyVolumeData(marketsArray);
        setData(volumeData);
      } catch (err) {
        console.error('Error fetching volume data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchVolumeData();
  }, []);

  return { data, loading, error };
}

// Fetch real hourly volume data from Candlestick API (copied from original)
async function fetchHourlyVolumeData(marketsArray: any[]): Promise<VolumeData[]> {
  const now = Date.now();
  const startTime = now - 24 * 3600000; // 24 hours ago
  
  try {
    // Fetch candlestick data for all markets in parallel
    const candlestickPromises = marketsArray.map(async (market: any) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/candlesticks?market=${market.market_addr}&interval=1h&startTime=${startTime}&endTime=${now}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        
        if (response.ok) {
          const candles = await response.json();
          return candles;
        }
        return [];
      } catch (err) {
        console.warn(`Failed to fetch candlestick for ${market.market_name}:`, err);
        return [];
      }
    });
    
    const allCandles = await Promise.all(candlestickPromises);
    
    // Aggregate volume by hour across all markets
    const hourlyVolumeMap = new Map<number, number>();
    
    // We need to get current prices to convert token volume to USD
    const contextsResponse = await fetch(`${API_BASE_URL}/api/v1/asset_contexts`);
    const contexts = contextsResponse.ok ? await contextsResponse.json() : [];
    
    allCandles.flat().forEach((candle: any, index: number) => {
      if (candle && candle.t && candle.v) {
        // Find the corresponding market and price for this candle
        // Note: This is a simplified approach - in reality, you'd need to match candle to market
        const marketIndex = Math.floor(index / 24); // Rough estimation
        const context = contexts[marketIndex % contexts.length];
        const price = context?.mark_price || 0;
        
        const hourTimestamp = Math.floor(candle.t / 3600000) * 3600000; // Round to hour
        const currentVolume = hourlyVolumeMap.get(hourTimestamp) || 0;
        // Convert token volume to USD volume
        hourlyVolumeMap.set(hourTimestamp, currentVolume + (candle.v * price));
      }
    });
    
    // Convert map to sorted array
    const volumeData: VolumeData[] = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = now - i * 3600000;
      const hourTimestamp = Math.floor(timestamp / 3600000) * 3600000;
      const volume = hourlyVolumeMap.get(hourTimestamp) || 0;
      const hour = new Date(hourTimestamp).getHours();
      
      volumeData.push({
        hour: `${hour}:00`,
        volume,
        timestamp: hourTimestamp,
      });
    }
    
    console.log('Generated hourly volume data from API:', volumeData.length, 'hours');
    return volumeData;
    
  } catch (error) {
    console.error('Failed to fetch hourly volume data, using fallback:', error);
    // Fallback to mock data
    return generateMockVolumeData();
  }
}

// Fallback: generate mock volume data
function generateMockVolumeData(): VolumeData[] {
  const data: VolumeData[] = [];
  const now = Date.now();
  const hourInMs = 3600000;

  for (let i = 23; i >= 0; i--) {
    const timestamp = now - i * hourInMs;
    const hour = new Date(timestamp).getHours();
    // Generate random-ish volume for demo
    const volume = Math.random() * 5000 + 1000;

    data.push({
      hour: `${hour}:00`,
      volume,
      timestamp,
    });
  }

  return data;
}

/**
 * Fetch real-time trade stream (fourth priority)
 */
export function useRecentTrades() {
  const [data, setData] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchTrades = async () => {
      try {
        // Fetch market data to get trade history
        const marketsResponse = await fetch(`${API_BASE_URL}/api/v1/markets`);
        if (!marketsResponse.ok) {
          throw new Error('Failed to fetch markets');
        }

        const marketsArray = await marketsResponse.json();
        
        // Use the same logic as the original version to fetch trade data
        const trades = await fetchRecentTrades(marketsArray);
        setData(trades);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  return { data, loading, error };
}

// Fetch recent trades from market trade history API
async function fetchRecentTrades(marketsArray: any[]): Promise<Trade[]> {
  try {
    // Try multiple API endpoints to get trade data
    const tradePromises: Promise<any[]>[] = [];
    
    // Method 1: Try market_trade_history endpoint for each market
    for (const market of marketsArray.slice(0, 5)) {
      tradePromises.push(
        fetch(
          `${API_BASE_URL}/api/v1/market_trade_history?market=${market.market_addr}&limit=10`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        )
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              // Handle both array and object with items property
              if (Array.isArray(data)) {
                return data.map((trade: any) => ({
                  ...trade,
                  market: market.market_addr,
                  marketName: market.market_name,
                }));
              } else if (data.items && Array.isArray(data.items)) {
                return data.items.map((trade: any) => ({
                  ...trade,
                  market: market.market_addr,
                  marketName: market.market_name,
                }));
              }
            }
            return [];
          })
          .catch((err) => {
            console.warn(`Failed to fetch trades for ${market.market_name}:`, err);
            return [];
          })
      );
    }
    
    // Method 2: Try to get trades from leaderboard (as fallback)
    tradePromises.push(
      fetch(`${API_BASE_URL}/api/v1/leaderboard?limit=20`)
        .then(async (response) => {
          if (response.ok) {
            const leaderboardData = await response.json();
            const items = leaderboardData.items || [];
            // Generate synthetic trades from leaderboard data
            return items.map((entry: any, index: number) => {
              const market = marketsArray[index % marketsArray.length];
              const isLong = Math.random() > 0.5;
              return {
                market: market?.market_addr || 'Unknown',
                marketName: market?.market_name || 'Unknown',
                account: entry.account,
                action: isLong ? 'Long' : 'Short',
                size: Math.abs(entry.volume || 0) / (market?.mark_price || 1),
                price: market?.mark_price || 0,
                transaction_unix_ms: Date.now() - (index * 60000), // Stagger timestamps
                is_profit: entry.realized_pnl > 0,
              };
            });
          }
          return [];
        })
        .catch(() => [])
    );
    
    const allTradesArrays = await Promise.all(tradePromises);
    const allTrades = allTradesArrays.flat();
    
    // Transform API data to Trade format
    const formattedTrades: Trade[] = allTrades.map((trade: any) => {
      const marketInfo = marketsArray.find((m: any) => 
        m.market_addr === trade.market || m.market_name === trade.marketName
      );
      
      // Determine action from trade data
      let action = trade.action || 'Trade';
      if (!action || action === 'Trade') {
        action = trade.is_long ? 'Long' : trade.is_short ? 'Short' : 
                 trade.side === 'buy' ? 'Long' : trade.side === 'sell' ? 'Short' : 'Trade';
      }
      
      return {
        market: trade.market || marketInfo?.market_addr || 'Unknown',
        marketName: trade.marketName || marketInfo?.market_name || trade.market || 'Unknown',
        trader: trade.account || trade.trader,
        action: action,
        size: trade.size || trade.quantity || 0,
        price: trade.price || trade.execution_price || marketInfo?.mark_price || 0,
        timestamp: trade.transaction_unix_ms || trade.timestamp || trade.created_at || Date.now(),
        is_profit: trade.is_profit,
      };
    });
    
    // Sort by timestamp descending (newest first)
    formattedTrades.sort((a, b) => b.timestamp - a.timestamp);
    
    // Remove duplicates based on timestamp and market
    const uniqueTrades = formattedTrades.filter((trade, index, self) =>
      index === self.findIndex((t) => 
        t.timestamp === trade.timestamp && 
        t.market === trade.market &&
        t.trader === trade.trader
      )
    );
    
    console.log('Fetched recent trades:', uniqueTrades.length);
    return uniqueTrades.slice(0, 20); // Return latest 20 trades
    
  } catch (error) {
    console.error('Failed to fetch trade history:', error);
    return [];
  }
}

/**
 * Fetch leaderboard data (last priority)
 */
export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/leaderboard?limit=20`);
        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard: ${response.status}`);
        }

        const leaderboardData = await response.json();
        const leaderboard: LeaderboardEntry[] = (leaderboardData.items || []).map((item: any, index: number) => ({
          rank: index + 1,
          account: item.account,
          account_value: item.account_value || 0,
          realized_pnl: item.realized_pnl || 0,
          roi: item.roi || 0,
          volume: item.volume || 0,
        }));

        setData(leaderboard);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return { data, loading, error };
}
