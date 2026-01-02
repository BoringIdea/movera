import { ChainType, ApiResponse } from './types';

/**
 * Get the base URL for API calls based on chain type
 */
export function getBaseUrl(chain: ChainType): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
  switch (chain) {
    case 'aptos':
      return `${baseUrl}/api/v1/aptos`;
    case 'movement':
      return `${baseUrl}/api/v1/movement`;
    case 'sui':
      return `${baseUrl}/api/v1/sui`;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Handle API response and check for errors
 */
export async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data: ApiResponse<T> = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
}

/**
 * Create query string from parameters
 */
export function createQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Generic fetch function with error handling
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    
    return await handleApiResponse<T>(response);
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
