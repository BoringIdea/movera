import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Cache configuration - Different refresh rates for different data types
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for passport score (low frequency)
const OVERVIEW_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for overview data
const DETAILS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for detailed data
const CACHE_KEY_PREFIX = 'passport_cache_';

// Cache interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache utility functions
function getCacheKey(userAddress: string, chain: string, endpoint: string): string {
  return `${CACHE_KEY_PREFIX}${endpoint}_${userAddress}_${chain}`;
}

function getCachedData<T>(cacheKey: string): T | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const cacheItem: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    
    if (now > cacheItem.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cacheItem.data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

function setCachedData<T>(cacheKey: string, data: T): void {
  try {
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export interface PassportOverview {
  score: number;
  grade: string;
  change: number;
  changePercent: number;
  protocols: number;
  volume: number;
  badges: {
    earned: number;
    total: number;
    progress: number;
  };
  breakdown: {
    longevity: number;
    balance: number;
    activity: number;
    diversity: number;
    volume: number;
    complexity: number;
    social: number;
  };
  lastUpdated: string;
}

export interface PassportDetails {
  scoreHistory: Array<{
    date: string;
    score: number;
    breakdown: any;
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    earned: boolean;
    progress: number;
    earnedAt?: string;
  }>;
  recentActivity: Array<{
    action: string;
    protocol: string;
    amount: string;
    token: string;
    time: string;
    status: string;
    txHash: string;
  }>;
  protocolInteractions: Array<{
    name: string;
    category: string;
    interactions: number;
    volume: number;
    lastInteraction: string;
    isDeepInteraction: boolean;
  }>;
  socialData: any;
  optimizationTips: string[];
  timeRange: string;
}

export function usePassportOverview(userAddress: string, chain: string) {
  const [data, setData] = useState<PassportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, 'overview');
    
    // Check cache first
    const cachedData = getCachedData<PassportOverview>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setInitialized(true);
    } else {
      // No cache, start with loading state
      setLoading(true);
      setInitialized(false);
    }

    const fetchData = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);
        
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/overview?user=${encodeURIComponent(userAddress)}&chain=${chain}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
          setInitialized(true);
        } else {
          throw new Error(result.message || 'Failed to fetch passport overview');
        }
      } catch (err) {
        console.error('Error fetching passport overview:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setInitialized(true);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData(!cachedData);

    // Set up auto-refresh every 2 minutes for overview data (less frequent)
    intervalRef.current = setInterval(() => {
      fetchData(false); // Don't show loading for background refresh
    }, OVERVIEW_CACHE_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userAddress, chain]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      setInitialized(false);
      const cacheKey = getCacheKey(userAddress, chain, 'overview');
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading: loading && !initialized, error, refetch };
}

export function usePassportDetails(userAddress: string, chain: string, timeRange: string = '30d') {
  const [data, setData] = useState<PassportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, `details_${timeRange}`);
    
    // Check cache first
    const cachedData = getCachedData<PassportDetails>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setInitialized(true);
    } else {
      // No cache, start with loading state
      setLoading(true);
      setInitialized(false);
    }

    const fetchData = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);
        
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/details?user=${encodeURIComponent(userAddress)}&chain=${chain}&timeRange=${timeRange}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
          setInitialized(true);
        } else {
          throw new Error(result.message || 'Failed to fetch passport details');
        }
      } catch (err) {
        console.error('Error fetching passport details:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setInitialized(true);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData(!cachedData);

    // Set up auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => {
      fetchData(false); // Don't show loading for background refresh
    }, DETAILS_CACHE_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userAddress, chain, timeRange]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      setInitialized(false);
      const cacheKey = getCacheKey(userAddress, chain, `details_${timeRange}`);
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading: loading && !initialized, error, refetch };
}

// ========== 新增轻量级hooks用于渐进式加载 ==========

export function usePassportOverviewBasic(userAddress: string, chain: string) {
  const [data, setData] = useState<PassportOverview | null>(null);
  const [loading, setLoading] = useState(false); // Start with false
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, 'overview_basic');
    
    // Check cache first
    const cachedData = getCachedData<PassportOverview>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return; // Don't fetch if we have cache
    }

    // Only show loading and fetch if no cache
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/overview/basic?user=${encodeURIComponent(userAddress)}&chain=${chain}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch basic passport overview');
        }
      } catch (err) {
        console.error('Error fetching basic passport overview:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up auto-refresh every 2 minutes (less frequent for basic data)
    intervalRef.current = setInterval(() => {
      // Background refresh without showing loading
      fetchData();
    }, OVERVIEW_CACHE_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userAddress, chain]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      const cacheKey = getCacheKey(userAddress, chain, 'overview_basic');
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading, error, refetch };
}

export function usePassportScoreHistory(userAddress: string, chain: string, timeRange: string = '30d') {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false); // Start with false
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, `score_history_${timeRange}`);
    
    // Check cache first
    const cachedData = getCachedData<any>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return; // Don't fetch if we have cache
    }

    // Only show loading and fetch if no cache
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/details/score-history?user=${encodeURIComponent(userAddress)}&chain=${chain}&timeRange=${timeRange}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch score history');
        }
      } catch (err) {
        console.error('Error fetching score history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userAddress, chain, timeRange]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      const cacheKey = getCacheKey(userAddress, chain, `score_history_${timeRange}`);
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading, error, refetch };
}

export function usePassportBadges(userAddress: string, chain: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false); // Start with false
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, 'badges');
    
    // Check cache first
    const cachedData = getCachedData<any>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return; // Don't fetch if we have cache
    }

    // Only show loading and fetch if no cache
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/details/badges?user=${encodeURIComponent(userAddress)}&chain=${chain}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch badges');
        }
      } catch (err) {
        console.error('Error fetching badges:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userAddress, chain]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      const cacheKey = getCacheKey(userAddress, chain, 'badges');
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading, error, refetch };
}

export function usePassportActivity(userAddress: string, chain: string, timeRange: string = '30d', limit: number = 10) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false); // Start with false
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, `activity_${timeRange}_${limit}`);
    
    // Check cache first
    const cachedData = getCachedData<any>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return; // Don't fetch if we have cache
    }

    // Only show loading and fetch if no cache
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/details/activity?user=${encodeURIComponent(userAddress)}&chain=${chain}&timeRange=${timeRange}&limit=${limit}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch activity');
        }
      } catch (err) {
        console.error('Error fetching activity:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userAddress, chain, timeRange, limit]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      const cacheKey = getCacheKey(userAddress, chain, `activity_${timeRange}_${limit}`);
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading, error, refetch };
}

export function usePassportProtocols(userAddress: string, chain: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false); // Start with false
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, 'protocols');
    
    // Check cache first
    const cachedData = getCachedData<any>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return; // Don't fetch if we have cache
    }

    // Only show loading and fetch if no cache
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/details/protocols?user=${encodeURIComponent(userAddress)}&chain=${chain}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch protocols');
        }
      } catch (err) {
        console.error('Error fetching protocols:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userAddress, chain]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      const cacheKey = getCacheKey(userAddress, chain, 'protocols');
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading, error, refetch };
}

export function usePassportScore(userAddress: string, chain: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userAddress || !chain) {
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userAddress, chain, 'score');
    
    // Check cache first
    const cachedData = getCachedData<any>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
    } else {
      // No cache, start with loading state
      setLoading(true);
    }

    const fetchData = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);
        
        const response = await fetch(
          `${API_BASE_URL}/api/v1/passport/score?user=${encodeURIComponent(userAddress)}&chain=${chain}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setCachedData(cacheKey, result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch passport score');
        }
      } catch (err) {
        console.error('Error fetching passport score:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData(!cachedData);

    // Set up auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => {
      fetchData(false); // Don't show loading for background refresh
    }, DETAILS_CACHE_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userAddress, chain]);

  const refetch = () => {
    if (userAddress && chain) {
      setLoading(true);
      setError(null);
      const cacheKey = getCacheKey(userAddress, chain, 'score');
      localStorage.removeItem(cacheKey); // Clear cache to force fresh fetch
    }
  };

  return { data, loading, error, refetch };
}
