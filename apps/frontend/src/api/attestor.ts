import useSWR from 'swr';
import { ChainType, NetworkType, ApiResponse, CountResult } from './types';
import { getBaseUrl, apiRequest } from './utils';

// SWR Hooks
export function useAttestorCount(chain: ChainType, network: NetworkType) {
  return useSWR(
    ['attestor-count', chain, network], 
    () => getAttestorCount(chain, network)
  );
}

// API Functions
export async function getAttestorCount(
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/attestations/attestors/count`;
  
  return await apiRequest<CountResult>(url);
}