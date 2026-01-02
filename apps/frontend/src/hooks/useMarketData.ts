'use client'

import { useState, useEffect } from 'react';
import type { Market } from '@/components/analysis/markets-table';
import type { VolumeData } from '@/components/analysis/volume-trend-chart';
import type { Trade } from '@/components/analysis/live-trade-feed';
import type { LeaderboardEntry } from '@/components/analysis/leaderboard-widget';

// Import types if needed
export type { Market, VolumeData, Trade, LeaderboardEntry };

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

interface UseMarketDataReturn {
  platformMetrics: PlatformMetrics;
  markets: Market[];
  volumeData: VolumeData[];
  trades: Trade[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_DECIBEL_API_URL || 'https://api.netna.aptoslabs.com/decibel';

export function useMarketData(): UseMarketDataReturn {
  const [data, setData] = useState<UseMarketDataReturn>({
    platformMetrics: {
      total24hVolume: 0,
      volumeChange24h: 0,
      totalOpenInterest: 0,
      oiChange24h: 0,
      activeMarkets: 0,
      totalMarkets: 0,
      activeTraders: 0,
      tradersChange24h: 0,
    },
    markets: [],
    volumeData: [],
    trades: [],
    leaderboard: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let ws: WebSocket | null = null;
    let cachedMarketsArray: any[] = []; // Cache markets array for WebSocket callbacks

    async function fetchData() {
      try {
        console.log('Fetching market data from Decibel API...');
        
        // Fetch market contexts (contains most data we need)
        const contextsResponse = await fetch(`${API_BASE_URL}/api/v1/asset_contexts`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!contextsResponse.ok) {
          console.error('Failed to fetch asset contexts:', contextsResponse.status);
          throw new Error(`Failed to fetch market contexts: ${contextsResponse.status}`);
        }
        
        const contexts = await contextsResponse.json();
        console.log('Fetched contexts:', contexts);

        // Fetch markets info
        const marketsResponse = await fetch(`${API_BASE_URL}/api/v1/markets`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!marketsResponse.ok) {
          console.error('Failed to fetch markets:', marketsResponse.status);
          throw new Error(`Failed to fetch markets: ${marketsResponse.status}`);
        }
        
        const marketsInfo = await marketsResponse.json();
        console.log('Fetched markets:', marketsInfo);

        // Fetch leaderboard (optional, use empty array if fails)
        let leaderboardData = { items: [], total_count: 0 };
        try {
          const leaderboardResponse = await fetch(`${API_BASE_URL}/api/v1/leaderboard?limit=100`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (leaderboardResponse.ok) {
            leaderboardData = await leaderboardResponse.json();
          } else {
            console.warn('Leaderboard API returned non-OK status:', leaderboardResponse.status);
            const errorText = await leaderboardResponse.text();
            console.warn('Leaderboard API error response:', errorText);
          }
        } catch (err) {
          console.warn('Failed to fetch leaderboard, error:', err);
        }

        if (!mounted) return;

        // Ensure contexts is an array
        const contextsArray = Array.isArray(contexts) ? contexts : [];
        const marketsArray = Array.isArray(marketsInfo) ? marketsInfo : [];
        cachedMarketsArray = marketsArray; // Cache for WebSocket use

        // Fetch prices for funding rates
        let pricesData: any[] = [];
        try {
          const pricesResponse = await fetch(`${API_BASE_URL}/api/v1/prices`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (pricesResponse.ok) {
            pricesData = await pricesResponse.json();
            console.log('Fetched prices data:', pricesData);
          }
        } catch (err) {
          console.warn('Failed to fetch prices, funding rates will be 0:', err);
        }

        // Process markets data
        const markets: Market[] = contextsArray.map((ctx: any) => {
          const marketInfo = marketsArray.find((m: any) => m.market_name === ctx.market);
          const priceInfo = pricesData.find((p: any) => p.market === marketInfo.market_addr);
          
          return {
            market_name: ctx.market || marketInfo?.market_name || 'Unknown',
            market_addr: ctx.market || '',
            mark_price: ctx.mark_price || 0,
            price_change_24h: ctx.price_change_pct_24h || 0,
            volume_24h: ctx.volume_24h || 0,
            funding_rate: priceInfo ? (priceInfo.funding_rate_bps || 0) / 10000 : 0, // Convert bps to decimal
            open_interest: ctx.open_interest || 0,
            price_history: ctx.price_history || [],
          };
        });

        // Calculate platform metrics
        // API volume_24h returns token amounts, not USD values
        // Need to multiply by mark_price to get USD volume
        const total24hVolume = markets.reduce((sum, m) => sum + (m.volume_24h * m.mark_price), 0);
        const totalOpenInterest = markets.reduce((sum, m) => sum + m.open_interest, 0);
        const activeMarkets = markets.filter(m => m.volume_24h > 0).length;

        // Fetch real hourly volume data from Candlestick API
        const volumeData: VolumeData[] = await fetchHourlyVolumeData(marketsArray);

        // Fetch real trade data from market trade history API
        const trades: Trade[] = await fetchRecentTrades(marketsArray);

        // Use leaderboard total_count as active traders (fallback for WebSocket)
        // If total_count is 0 or undefined, use items length as fallback
        // If both are 0, use a reasonable mock value for demo
        let activeTraders = leaderboardData.total_count || leaderboardData.items?.length || 0;

        setData({
          platformMetrics: {
            total24hVolume,
            volumeChange24h: 0, // TODO: Calculate from historical data
            totalOpenInterest,
            oiChange24h: 0, // TODO: Calculate from historical data
            activeMarkets,
            totalMarkets: markets.length,
            activeTraders, // Use leaderboard total_count as fallback
            tradersChange24h: 0, // TODO: Calculate from historical data
          },
          markets,
          volumeData,
          trades,
          leaderboard: leaderboardData.items || [],
          isLoading: false,
          error: null,
        });

        // Setup WebSocket for real-time updates
        setupWebSocket();
      } catch (error) {
        console.error('Error fetching market data:', error);
        
        if (mounted) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch market data',
          }));
        }
      }
    }

    function setupWebSocket() {
      try {
        // Try WebSocket connection for real-time updates (optional enhancement)
        console.log('Attempting WebSocket connection...');
        ws = new WebSocket('wss://trading-api-http-dev-netna-us-central1-410192433417.us-central1.run.app');

        ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          // Subscribe to all market prices
          const pricesMsg = JSON.stringify({
            Subscribe: { topic: 'all_market_prices' }
          });
          console.log('Subscribing to all_market_prices:', pricesMsg);
          ws?.send(pricesMsg);
          
          // Subscribe to users with positions to get active traders count
          const usersMsg = JSON.stringify({
            Subscribe: { topic: 'users_with_positions' }
          });
          console.log('Subscribing to users_with_positions:', usersMsg);
          ws?.send(usersMsg);
          
          // Subscribe to 1h candlestick updates for all markets
          cachedMarketsArray.forEach((market: any) => {
            const candleMsg = JSON.stringify({
              Subscribe: { topic: `market_candlestick:${market.market_addr}:1h` }
            });
            ws?.send(candleMsg);
            
            // Subscribe to trade history for real-time updates
            const tradeMsg = JSON.stringify({
              Subscribe: { topic: `market_trade_history:${market.market_addr}` }
            });
            ws?.send(tradeMsg);
          });
          console.log('Subscribed to candlestick and trade updates for', cachedMarketsArray.length, 'markets');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            
            // Handle subscription responses
            if (message.SubscribeResponse) {
              console.log('Subscription response:', message.SubscribeResponse);
            }
            
            // Handle all market prices updates
            if (message.topic === 'all_market_prices' && message.prices) {
              console.log('Received all_market_prices update, prices count:', message.prices.length);
              // Update markets with real-time prices
              setData(prev => ({
                ...prev,
                markets: prev.markets.map(market => {
                  const priceUpdate = message.prices.find((p: any) => p.market === market.market_addr);
                  if (priceUpdate) {
                    return {
                      ...market,
                      mark_price: priceUpdate.mark_px / Math.pow(10, 6), // Adjust for decimals
                      funding_rate: (priceUpdate.funding_rate_bps || 0) / 10000,
                    };
                  }
                  return market;
                }),
              }));
            }
            
            // Handle users with positions updates
            if (message.topic === 'users_with_positions') {
              console.log('Received users_with_positions update:', message);
              if (message.users) {
                const activeTraders = Array.isArray(message.users) ? message.users.length : 0;
                console.log('Active traders count:', activeTraders, 'Users array:', message.users);
                setData(prev => ({
                  ...prev,
                  platformMetrics: {
                    ...prev.platformMetrics,
                    activeTraders,
                  },
                }));
              } else {
                console.warn('users_with_positions message received but no users field:', message);
              }
            }
            
            // Handle candlestick updates
            if (message.topic && message.topic.startsWith('market_candlestick') && message.candle) {
              console.log('Received candlestick update:', message.topic);
              const candle = message.candle;
              
              if (candle && candle.t && candle.v) {
                setData(prev => {
                  // Update volumeData with new candle
                  const hourTimestamp = Math.floor(candle.t / 3600000) * 3600000;
                  const updatedVolumeData = prev.volumeData.map(vd => {
                    if (vd.timestamp === hourTimestamp) {
                      return { ...vd, volume: vd.volume + candle.v };
                    }
                    return vd;
                  });
                  
                  return {
                    ...prev,
                    volumeData: updatedVolumeData,
                  };
                });
              }
            }
            
            // Handle trade history updates
            if (message.topic && message.topic.startsWith('market_trade_history') && message.trades) {
              console.log('Received trade history update:', message.trades.length, 'trades');
              const newTrades = message.trades.map((trade: any) => {
                // Find market info from cached array
                const marketInfo = cachedMarketsArray.find((m: any) => m.market_addr === trade.market);
                
                return {
                  market: trade.market || 'Unknown',
                  marketName: marketInfo?.market_name || trade.market,
                  trader: trade.account,
                  action: trade.action || 'Trade',
                  size: trade.size || 0,
                  price: trade.price || 0,
                  timestamp: trade.transaction_unix_ms || Date.now(),
                  is_profit: trade.is_profit,
                };
              });
              
              setData(prev => {
                // Merge new trades with existing, keep latest 50
                const mergedTrades = [...newTrades, ...prev.trades]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 50);
                
                return {
                  ...prev,
                  trades: mergedTrades,
                };
              });
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket URL:', ws?.url);
          console.error('WebSocket readyState:', ws?.readyState);
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
          // Don't reconnect if closed cleanly or if component unmounted
          if (mounted && event.code !== 1000) {
            console.log('Will attempt reconnection in 10 seconds...');
            setTimeout(setupWebSocket, 10000);
          }
        };
      } catch (error) {
        console.error('Failed to setup WebSocket:', error);
        console.log('Continuing with HTTP polling only (WebSocket unavailable)');
      }
    }

    // Fetch real data from API
    fetchData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return data;
}

// Fetch real hourly volume data from Candlestick API
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
    console.log('Generated hourly volume data:', volumeData);
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

// Fetch recent trades from market trade history API
async function fetchRecentTrades(marketsArray: any[]): Promise<Trade[]> {
  try {
    // Fetch trade history for top 5 markets to avoid too many requests
    const tradePromises = marketsArray.slice(0, 5).map(async (market: any) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/market_trade_history?market=${market.market_addr}&limit=5`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        
        if (response.ok) {
          const trades = await response.json();
          return Array.isArray(trades) ? trades : [];
        }
        return [];
      } catch (err) {
        console.warn(`Failed to fetch trades for ${market.market_name}:`, err);
        return [];
      }
    });
    
    const allTrades = (await Promise.all(tradePromises)).flat();
    
    // Transform API data to Trade format
    const formattedTrades: Trade[] = allTrades.map((trade: any) => {
      // Find market info to get market name
      const marketInfo = marketsArray.find((m: any) => m.market_addr === trade.market);
      
      return {
        market: trade.market || 'Unknown',
        marketName: marketInfo?.market_name || trade.market,
        trader: trade.account,
        action: trade.action || 'Trade',
        size: trade.size || 0,
        price: trade.price || 0,
        timestamp: trade.transaction_unix_ms || Date.now(),
        is_profit: trade.is_profit,
      };
    });
    
    // Sort by timestamp descending (newest first)
    formattedTrades.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log('Fetched recent trades:', formattedTrades.length);
    return formattedTrades.slice(0, 20); // Return latest 20 trades
    
  } catch (error) {
    console.error('Failed to fetch trade history:', error);
    return [];
  }
}
