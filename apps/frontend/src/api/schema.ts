import useSWR from 'swr';
import { 
  ChainType, 
  NetworkType, 
  ApiResponse, 
  Schema, 
  CountResult, 
  PaginationParams,
  SearchParams 
} from './types';
import { getBaseUrl, createQueryString, apiRequest } from './utils';

// SWR Hooks
export function useSchemas(
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
) {
  const { offset = 0, limit = 10 } = params;
  return useSWR(
    ['schemas', chain, network, offset, limit], 
    () => fetchSchemas(chain, network, { offset, limit })
  );
}

export function useSchema(address: string, chain: ChainType, network: NetworkType) {
  return useSWR(
    ['schema', address, chain, network], 
    () => fetchSchema(address, chain, network)
  );
}

export function useSchemaCount(chain: ChainType, network: NetworkType) {
  return useSWR(
    ['schema-count', chain, network], 
    () => getSchemaCount(chain, network)
  );
}

export function useSchemaCreatorCount(chain: ChainType, network: NetworkType) {
  return useSWR(
    ['schema-creator-count', chain, network], 
    () => getSchemaCreatorCount(chain, network)
  );
}

export function useSearchSchemas(
  chain: ChainType, 
  network: NetworkType, 
  searchInput: string,
  enabled: boolean = true
) {
  return useSWR(
    enabled && searchInput ? ['search-schemas', chain, network, searchInput] : null,
    () => searchSchemas(chain, network, { searchInput })
  );
}

// API Functions
export async function fetchSchemas(
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
): Promise<ApiResponse<Schema[]>> {
  const baseUrl = getBaseUrl(chain);
  const queryString = createQueryString(params);
  const url = `${baseUrl}/schemas${queryString}`;
  
  return await apiRequest<Schema[]>(url);
}

export async function fetchSchema(
  schemaAddress: string, 
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<Schema>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/schemas/${schemaAddress}`;
  
  return await apiRequest<Schema>(url);
}

export async function getSchemaCount(
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/schemas/count`;
  
  return await apiRequest<CountResult>(url);
}

export async function getSchemaCreatorCount(
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/schemas/creators/count`;
  
  return await apiRequest<CountResult>(url);
}

export async function searchSchemas(
  chain: ChainType, 
  network: NetworkType, 
  params: SearchParams
): Promise<ApiResponse<Schema[]>> {
  const baseUrl = getBaseUrl(chain);
  const queryString = createQueryString(params);
  const url = `${baseUrl}/schemas/search${queryString}`;
  
  return await apiRequest<Schema[]>(url);
}