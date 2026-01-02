import useSWR from 'swr';
import { 
  ChainType, 
  NetworkType, 
  ApiResponse, 
  AttestationWithSchema, 
  CountResult, 
  PaginationParams 
} from './types';
import { getBaseUrl, createQueryString, apiRequest } from './utils';

// SWR Hooks
export function useAttestations(
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
) {
  const { offset = 0, limit = 10 } = params;
  return useSWR(
    ['attestations', chain, network, offset, limit], 
    () => fetchAttestations(chain, network, { offset, limit })
  );
}

export function useAttestation(
  address: string, 
  chain: ChainType, 
  network: NetworkType
) {
  return useSWR(
    ['attestation', address, chain, network], 
    () => fetchAttestation(address, chain, network)
  );
}

export function useAttestationCount(chain: ChainType, network: NetworkType) {
  return useSWR(
    ['attestation-count', chain, network], 
    () => getAttestationCount(chain, network)
  );
}

export function useAttestationsBySchema(
  schema: string, 
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
) {
  const { offset = 0, limit = 10 } = params;
  return useSWR(
    ['attestations-by-schema', schema, chain, network, offset, limit], 
    () => fetchAttestationsBySchema(schema, chain, network, { offset, limit })
  );
}

export function useAttestationsByUser(
  address: string, 
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
) {
  const { offset = 0, limit = 10 } = params;
  return useSWR(
    ['attestations-by-user', address, chain, network, offset, limit], 
    () => fetchAttestationsByUser(address, chain, network, { offset, limit })
  );
}

export function useAttestationCountBySchema(
  schema: string, 
  chain: ChainType, 
  network: NetworkType
) {
  return useSWR(
    ['attestation-count-by-schema', schema, chain, network], 
    () => getAttestationCountBySchema(schema, chain, network)
  );
}

export function useAttestationCountByUser(
  address: string, 
  chain: ChainType, 
  network: NetworkType
) {
  return useSWR(
    ['attestation-count-by-user', address, chain, network], 
    () => getAttestationCountByUser(address, chain, network)
  );
}

export function useAttestationCountByCreator(
  address: string, 
  chain: ChainType, 
  network: NetworkType
) {
  return useSWR(
    ['attestation-count-by-creator', address, chain, network], 
    () => getAttestationCountByCreator(address, chain, network)
  );
}

export function useAttestationCountByRecipient(
  address: string, 
  chain: ChainType, 
  network: NetworkType
) {
  return useSWR(
    ['attestation-count-by-recipient', address, chain, network], 
    () => getAttestationCountByRecipient(address, chain, network)
  );
}

// API Functions
export async function fetchAttestations(
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
): Promise<ApiResponse<AttestationWithSchema[]>> {
  const baseUrl = getBaseUrl(chain);
  const queryString = createQueryString(params);
  const url = `${baseUrl}/attestations${queryString}`;
  
  return await apiRequest<AttestationWithSchema[]>(url);
}

export async function fetchAttestationsBySchema(
  schema: string,
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
): Promise<ApiResponse<AttestationWithSchema[]>> {
  const baseUrl = getBaseUrl(chain);
  const queryString = createQueryString(params);
  const url = `${baseUrl}/attestations/schemas/${schema}${queryString}`;
  
  return await apiRequest<AttestationWithSchema[]>(url);
}

export async function fetchAttestationsByUser(
  address: string,
  chain: ChainType, 
  network: NetworkType, 
  params: PaginationParams = {}
): Promise<ApiResponse<AttestationWithSchema[]>> {
  const baseUrl = getBaseUrl(chain);
  const queryString = createQueryString(params);
  const url = `${baseUrl}/attestations/users/${address}${queryString}`;
  
  return await apiRequest<AttestationWithSchema[]>(url);
}

export async function fetchAttestation(
  address: string,
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<AttestationWithSchema>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/attestations/${address}`;
  
  return await apiRequest<AttestationWithSchema>(url);
}

export async function getAttestationCount(
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/attestations/count`;
  
  return await apiRequest<CountResult>(url);
}

export async function getAttestationCountBySchema(
  schema: string,
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/attestations/schemas/${schema}/count`;
  
  return await apiRequest<CountResult>(url);
}

export async function getAttestationCountByUser(
  address: string,
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/attestations/users/${address}/count`;
  
  return await apiRequest<CountResult>(url);
}

export async function getAttestationCountByCreator(
  address: string,
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/attestations/creators/${address}/count`;
  
  return await apiRequest<CountResult>(url);
}

export async function getAttestationCountByRecipient(
  address: string,
  chain: ChainType, 
  network: NetworkType
): Promise<ApiResponse<CountResult>> {
  const baseUrl = getBaseUrl(chain);
  const url = `${baseUrl}/attestations/recipients/${address}/count`;
  
  return await apiRequest<CountResult>(url);
}


