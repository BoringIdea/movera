export type SuiAddress = string;

// Storage type enumeration
export enum StorageType {
  ON_CHAIN = 0,
  OFF_CHAIN = 1,  // Off-chain storage, default to Walrus
}

export interface SuiAttestation {
  attestationAddr: SuiAddress;
  schemaAddr: SuiAddress;
  ref_attestation: SuiAddress;
  time: bigint;
  expiration_time: bigint;
  revocation_time: bigint;
  revokable: boolean;
  attestor: SuiAddress;
  recipient: SuiAddress;
  
  // Storage type (new)
  storageType: StorageType;
  
  // Method 1: On-chain storage (backward compatible)
  // Used when storageType === ON_CHAIN
  data?: Uint8Array;  // On-chain stored data (optional, backward compatible)
  
  // Method 2: Off-chain storage (new, default: Walrus)
  // Used when storageType === OFF_CHAIN
  walrusSuiObjectId?: SuiAddress;  // Sui object ID of Walrus blob
  walrusBlobId?: string;           // Walrus blob ID (base64url string)
  dataHash?: Uint8Array;
  encrypted?: boolean;
  sealNonce?: Uint8Array;          // Seal encryption nonce (for encrypted OFF_CHAIN)
  sealPolicyId?: SuiAddress;       // Optional policy ID for other patterns
  
  // Metadata (preserved)
  name: string;
  description: string;
  url: string;
  // owner: ObjectOwner | null;
  txHash?: string;
}

export interface Status {
  is_revoked: boolean;
  timestamp: string;
}

export interface AttestationRegistry {
  id: string;
  version: Version;
}

export interface SuiSchema {
  schemaAddr: SuiAddress;
  name: string;
  description: string;
  url: string;
  creator: SuiAddress;
  createdAt: number;
  schema: Uint8Array;
  revokable: boolean;
  resolver: any | null;
  txHash?: string;
}

export interface SchemaRegistry {
  id: SuiAddress;
  version: Version;
}



export type Version = {
  id: SuiAddress;
  version: number;
};