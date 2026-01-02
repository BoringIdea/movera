import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import type { SealClient as SealClientType, SealClientOptions } from '@mysten/seal';
import { SealClient, SessionKey, EncryptedObject, DemType } from '@mysten/seal';
import type { EncryptOptions } from '@mysten/seal';
import type { ClientWithExtensions, Experimental_CoreClient } from '@mysten/sui/experimental';
import { getFullnodeUrl, SuiClient as SuiClientClass } from '@mysten/sui/client';
import { fromHEX } from '@mysten/bcs';

/**
 * Seal SDK wrapper for privacy-preserving encryption
 * Seal is a decentralized secrets management (DSM) product
 * Documentation: https://seal-docs.wal.app/
 * GitHub: https://github.com/MystenLabs/seal
 */

export interface SealKeyServerConfig {
  objectId: string;
  weight: number;
  apiKeyName?: string;
  apiKey?: string;
}

// KemType enum (matching Seal SDK)
export enum KemType {
  BonehFranklinBLS12381DemCCA = 0,
}

export interface SealPolicy {
  packageId: string;
  id: string;
  threshold: number;
  keyServers: SealKeyServerConfig[];
  kemType?: KemType;
  demType?: DemType;
}

export interface SealConfig {
  serverConfigs: SealKeyServerConfig[];
  verifyKeyServers?: boolean;
  timeout?: number;
}

/**
 * SealWrapper for encrypting/decrypting data with Seal
 * This wraps the official @mysten/seal SDK
 */
export class SealWrapper {
  private sealClient: SealClientType;
  private suiClient: SealClientType extends SealClientType ? ClientWithExtensions<{
    core: Experimental_CoreClient;
  }> : SuiClient;

  constructor(suiClient: SuiClient, config: SealConfig) {
    // Create SealClient directly (not as extension)
    const client = new SuiClientClass({
      url: (suiClient as any).url || getFullnodeUrl('testnet'),
      network: 'testnet',
    }) as any; // Type assertion for compatibility

    this.suiClient = client;
    this.sealClient = new SealClient({
      suiClient: client,
      serverConfigs: config.serverConfigs,
      verifyKeyServers: config.verifyKeyServers ?? true,
      timeout: config.timeout ?? 10_000,
    });
  }

  /**
   * Encrypt data using Seal
   * @param data Data to encrypt
   * @param policy Seal encryption policy
   * @param aad Optional additional authenticated data
   * @returns Encrypted data and symmetric key (for backup)
   */
  async encryptData(
    data: Uint8Array,
    policy: SealPolicy,
    aad?: Uint8Array
  ): Promise<{ encryptedData: Uint8Array; key: Uint8Array }> {
    const result = await this.sealClient.encrypt({
      threshold: policy.threshold,
      packageId: policy.packageId,
      id: policy.id,
      data,
      aad: aad || new Uint8Array(),
      kemType: policy.kemType,
      demType: policy.demType,
    });

    return {
      encryptedData: result.encryptedObject,
      key: result.key, // Symmetric key (can be used for backup, but should not be shared)
    };
  }

  /**
   * Decrypt data using Seal (requires access permission)
   * Note: Seal decryption requires multiple steps:
   * 1. Create a SessionKey
   * 2. Create transaction bytes that call seal_approve* functions (e.g., seal_approve_allowlist, seal_approve_subscription)
   * 3. Fetch keys from key servers
   * 4. Decrypt the data
   * 
   * This method handles steps 2-4. You must create the SessionKey separately and provide txBytes.
   * For advanced usage, use the underlying SealClient methods directly.
   * 
   * @param encryptedData Encrypted data (EncryptedObject bytes)
   * @param sessionKey SessionKey instance (must be created beforehand)
   * @param txBytes Transaction bytes that calls seal_approve* functions (required for Seal)
   * @param checkShareConsistency Whether to check share consistency (default: true)
   * @returns Decrypted data
   */
  async decryptData(
    encryptedData: Uint8Array,
    sessionKey: SessionKey,
    txBytes: Uint8Array,
    checkShareConsistency: boolean = true
  ): Promise<Uint8Array> {
    // Parse encrypted object to get the ID and threshold
    const encryptedObj = EncryptedObject.parse(encryptedData);
    
    // Fetch keys from key servers (this will be called internally by decrypt, but we can also call it explicitly)
    // The decrypt method will automatically fetch keys if needed, but calling it explicitly can be useful for debugging
    
    // Decrypt the data (decrypt method handles fetching keys internally if needed)
    return await this.sealClient.decrypt({
      data: encryptedData,
      sessionKey,
      txBytes,
      checkShareConsistency,
    });
  }

  /**
   * Fetch keys from key servers for decryption (low-level method)
   * @param ids Array of encrypted object IDs (full IDs: packageId::id)
   * @param sessionKey Session key
   * @param txBytes Transaction bytes that calls seal_approve* functions
   * @param threshold Threshold for decryption
   */
  async fetchKeys(
    ids: string[],
    sessionKey: SessionKey,
    txBytes: Uint8Array,
    threshold: number
  ): Promise<void> {
    await this.sealClient.fetchKeys({
      ids,
      sessionKey,
      txBytes,
      threshold,
    });
  }

  /**
   * Create a SessionKey for Seal operations
   * @param userAddress User address
   * @param packageId Package ID
   * @param signer Signer for signing personal message
   * @param ttlMin TTL in minutes (1-30, default: 30)
   * @returns SessionKey instance
   */
  async createSessionKey(
    userAddress: string,
    packageId: string,
    signer: Signer,
    ttlMin: number = 30
  ): Promise<SessionKey> {
    return await SessionKey.create({
      address: userAddress,
      packageId,
      ttlMin,
      signer,
      suiClient: this.suiClient as any,
    });
  }

  /**
   * Get the underlying Seal client for advanced operations
   */
  getClient(): SealClientType {
    return this.sealClient;
  }

  /**
   * Get the Sui client
   */
  getSuiClient(): SuiClient {
    return this.suiClient as SuiClient;
  }
}

/**
 * Helper function to convert Sui address string to 32-byte Uint8Array
 * This matches Move's address.to_bytes() behavior
 * @param address Sui address string (with or without 0x prefix)
 * @returns 32-byte Uint8Array representing the address
 */
export function addressToBytes(address: string): Uint8Array {
  // Remove '0x' prefix if present, then convert hex string to bytes
  const hexString = address.startsWith('0x') ? address.slice(2) : address;
  return fromHEX(hexString);
}

/**
 * Compute Seal key ID matching seal_access.move::compute_key_id
 * Seal ID format: [attestor address bytes (32 bytes)][nonce bytes]
 * This must match the computation in seal_access.move exactly
 * 
 * The full Seal ID used for encryption will be: [packageId][attestor][nonce]
 * But this function returns only the part without packageId: [attestor][nonce]
 * 
 * Using nonce instead of attestation_id allows encryption before attestation creation
 * 
 * @param attestor Attestor address string
 * @param nonce Nonce bytes (typically 16-32 bytes)
 * @returns Hex string representing the Seal key ID (without packageId prefix)
 */
export function computeSealKeyId(attestor: string, nonce: Uint8Array): string {
  const attestorBytes = addressToBytes(attestor);
  
  // Concatenate: [attestor bytes][nonce bytes]
  const sealIdBytes = new Uint8Array(attestorBytes.length + nonce.length);
  sealIdBytes.set(attestorBytes, 0);
  sealIdBytes.set(nonce, attestorBytes.length);
  
  // Convert to hex string for Seal SDK (without 0x prefix)
  return Array.from(sealIdBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

