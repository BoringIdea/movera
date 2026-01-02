import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import type { ClientWithExtensions, Experimental_CoreClient } from '@mysten/sui/experimental';
import { getFullnodeUrl, SuiClient as SuiClientClass } from '@mysten/sui/client';
import { walrus, type WalrusClient as WalrusClientType, blobIdFromInt } from '@mysten/walrus';
import type { Network } from './utils';

export interface WalrusConfig {
  network?: Network;
  uploadRelay?: {
    host: string;
    sendTip?:
      | null
      | {
          address: string;
          max?: number;
          kind: { const: number } | { linear: { base: number; perEncodedKib: number } };
        }
      | { max: number };
  };
  storageNodeClientOptions?: {
    timeout?: number;
    onError?: (error: Error) => void;
  };
}

/**
 * WalrusClient wrapper for interacting with Walrus decentralized storage
 * Note: Walrus is the default off-chain storage solution
 * This wraps the official @mysten/walrus SDK
 */
export class WalrusClient {
  private walrusClient: WalrusClientType;
  private suiClient: ClientWithExtensions<{
    core: Experimental_CoreClient;
    walrus: WalrusClientType;
  }>;
  private baseSuiClient: SuiClientClass;

  constructor(suiClient: SuiClient, config?: WalrusConfig) {
    // Create a SuiClient with walrus extension
    const network = config?.network || 'testnet';
    const client = new SuiClientClass({
      url: (suiClient as any).url || getFullnodeUrl(network),
      network: network as 'mainnet' | 'testnet',
    }).$extend(
      walrus({
        network: network as 'mainnet' | 'testnet',
        uploadRelay: config?.uploadRelay as any, // Type assertion for compatibility
        storageNodeClientOptions: config?.storageNodeClientOptions || {
          timeout: 60_000, // 60 seconds timeout for slow nodes
        },
      })
    );

    this.suiClient = client as any;
    this.walrusClient = (client as any).walrus;
    this.baseSuiClient = client;
  }

  /**
   * Upload data to Walrus and return both Sui object ID and blob ID
   * @param data Data to upload
   * @param signer Signer to sign and pay for the transaction
   * @param epochs Number of epochs to store the data (default: 3)
   * @param deletable Whether the blob can be deleted (default: false)
   * @returns Object containing both Sui object ID and blob ID (base64url)
   */
  async uploadData(
    data: Uint8Array,
    signer: Signer,
    epochs: number = 3,
    deletable: boolean = false,
    owner?: string // Optional owner address (defaults to signer address)
  ): Promise<{ suiObjectId: string; blobId: string }> {
    const result = await this.walrusClient.writeBlob({
      blob: data,
      epochs,
      deletable,
      signer,
      owner, // Pass owner if provided, otherwise defaults to signer address
    });

    // Return both Sui object ID and base64url blobId
    // The blobObject has the Sui object that represents the blob on-chain
    // blobObject.id.id is the Sui address of the blob object
    // result.blobId is the base64url blob ID
    return {
      suiObjectId: result.blobObject.id.id,
      blobId: result.blobId,
    };
  }

  /**
   * Download data from Walrus by blob ID (base64url string) or Sui object ID
   * @param identifier Either blob ID (base64url) or Sui object ID
   * @param useBlobId If true, identifier is treated as blob ID; if false, as Sui object ID (default: false)
   * @returns Downloaded data
   */
  async downloadData(identifier: string, useBlobId: boolean = false): Promise<Uint8Array> {
    let blobId: string;
    
    if (useBlobId) {
      // Identifier is already a blob ID (base64url)
      blobId = identifier;
    } else {
      // Identifier is a Sui object ID, need to get blobId from chain
      blobId = await this.getBlobIdFromObjectId(identifier);
    }
    
    // Use the blobId to read the actual blob data
    return await this.walrusClient.readBlob({ blobId });
  }
  
  /**
   * Get blobId (base64url string) from Sui object ID
   * @param objectId Sui object ID of the blob object
   * @returns Blob ID as base64url string
   */
  async getBlobIdFromObjectId(objectId: string): Promise<string> {
    // Read the Blob object from Sui chain using the base Sui client
    const response = await this.baseSuiClient.getObject({
      id: objectId,
      options: {
        showContent: true,
      },
    });
    
    if (response.error || !response.data || !response.data.content) {
      throw new Error(`Failed to get blob object: ${response.error?.code || 'Unknown error'}`);
    }
    
    if (response.data.content.dataType !== 'moveObject') {
      throw new Error('Object is not a move object');
    }
    
    const fields = response.data.content.fields as any;
    
    // Extract blob_id (u256) from the Blob object
    const blobIdU256 = fields.blob_id;
    if (!blobIdU256) {
      throw new Error('blob_id field not found in Blob object');
    }
    
    // Convert u256 to base64url blobId string
    return blobIdFromInt(blobIdU256);
  }

  /**
   * Calculate Blake2b-256 hash of data (same as Sui uses)
   * Note: This uses Walrus's computeBlobMetadata to get the actual hash that matches Sui's hash::blake2b256
   * @param data Data to hash
   * @returns Hash as Uint8Array (rootHash from blob metadata)
   */
  async calculateHash(data: Uint8Array): Promise<Uint8Array> {
    // Use Walrus's computeBlobMetadata to get the actual hash
    // This matches Sui's hash::blake2b256 calculation
    const metadata = await this.walrusClient.computeBlobMetadata({ bytes: data });
    // Return rootHash which is the Blake2b-256 hash
    return metadata.rootHash;
  }

  /**
   * Get the underlying Walrus client for advanced operations
   */
  getClient(): WalrusClientType {
    return this.walrusClient;
  }

  /**
   * Check if two Uint8Arrays are equal
   */
  arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

