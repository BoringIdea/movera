import {
  SuiClient,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { getAttestationRegistryId, getClient, getPackageId, Network } from './utils';
import { Schema } from './schema';
import { SuiAttestation, AttestationRegistry, StorageType } from './types';
import { WalrusClient } from './walrus';
import { SealWrapper } from './seal';

export class Sas {
  private client: SuiClient;
  private signer: Ed25519Keypair;
  private packageId: string;
  private network: Network;
  private chain: string;
  private schema: Schema;

  constructor(chain: string, network: Network, signer: Ed25519Keypair) {
    this.chain = chain;
    this.client = getClient(chain, network);
    this.signer = signer;
    this.packageId = getPackageId(chain, network);
    this.network = network;
    this.schema = new Schema(chain, network, signer);
  }

  async registerSchema(
    schema: Uint8Array,
    name: string,
    description: string,
    url: string,
    revokable: boolean,
  ): Promise<SuiTransactionBlockResponse> {
    return this.schema.new(schema, name, description, url, revokable);
  }

  async registerSchemaWithResolver(
    schema: Uint8Array,
    name: string,
    description: string,
    url: string,
    revokable: boolean,
    resolver: string
  ): Promise<SuiTransactionBlockResponse> {
    return this.schema.newWithResolver(schema, name, description, url, revokable, resolver);
  }

  async attest(
    schemaId: string,
    refAttestationId: string,
    recipient: string,
    expirationTime: bigint,
    data: Uint8Array,
    name: string,
    description: string,
    url: string,
    storageType?: StorageType,
    walrusSuiObjectId?: string,
    walrusBlobId?: string,
    dataHash?: Uint8Array,
    encrypted?: boolean,
    sealNonce?: Uint8Array,
    sealPolicyId?: string
  ): Promise<SuiTransactionBlockResponse> {
    const registryId = getAttestationRegistryId(this.chain, this.network);
    const tx = new Transaction();

    // Determine which function to call based on storage type
    const storage = storageType ?? StorageType.ON_CHAIN;

    if (storage === StorageType.ON_CHAIN) {
      // Method 1: On-chain storage (backward compatible)
      tx.moveCall({
        target: `${this.packageId}::sas::attest`,
        arguments: [
          tx.object(schemaId),
          tx.object(registryId),
          tx.pure.address(refAttestationId),
          tx.pure.address(recipient),
          tx.pure.u64(expirationTime),
          tx.pure.vector('u8', data),
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.string(url),
          tx.object(SUI_CLOCK_OBJECT_ID)
        ],
      });
    } else {
      // Method 2: Off-chain storage (new feature)
      if (!walrusSuiObjectId || !walrusBlobId || !dataHash) {
        throw new Error('walrusSuiObjectId, walrusBlobId, and dataHash are required for OFF_CHAIN storage');
      }

      // Convert walrusBlobId (base64url string) to bytes
      const walrusBlobIdBytes = new TextEncoder().encode(walrusBlobId);

      // Call attest_off_chain function
      tx.moveCall({
        target: `${this.packageId}::sas::attest_off_chain`,
        arguments: [
          tx.object(schemaId),
          tx.object(registryId),
          tx.pure.address(refAttestationId),
          tx.pure.address(recipient),
          tx.pure.u64(expirationTime),
          tx.pure.address(walrusSuiObjectId),
          tx.pure.vector('u8', walrusBlobIdBytes),
          tx.pure.vector('u8', dataHash),
          tx.pure.bool(encrypted || false),
          tx.pure.option('vector<u8>', sealNonce ? Array.from(sealNonce) : null),
          tx.pure.option('address', sealPolicyId ? sealPolicyId : null),
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.string(url),
          tx.object(SUI_CLOCK_OBJECT_ID)
        ],
      });
    }

    const result = await this.client.signAndExecuteTransaction({
      signer: this.signer,
      transaction: tx,
    });

    return await this.client.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
      },
    });
  }

  async attestWithResolver(
    schemaId: string,
    refAttestationId: string,
    recipient: string,
    expirationTime: bigint,
    data: Uint8Array,
    name: string,
    description: string,
    url: string,
    resolverModule: string
  ): Promise<SuiTransactionBlockResponse> {
    const registryId = getAttestationRegistryId(this.chain, this.network);
    const tx = new Transaction();

    const [request] = tx.moveCall(
      {
        target: `${this.packageId}::schema::start_attest`,
        arguments: [
          tx.object(schemaId),
        ]
      }
    );

    tx.moveCall({
      target: `${resolverModule}::approve`,
      arguments: [
        tx.object(schemaId),
        request,
      ]
    });

    tx.moveCall({
      target: `${this.packageId}::sas::attest_with_resolver`,
      arguments: [
        tx.object(schemaId),
        tx.object(registryId),
        tx.pure.address(refAttestationId),
        tx.pure.address(recipient),
        tx.pure.u64(expirationTime),
        tx.pure.vector('u8', data),
        tx.pure.string(name),
        tx.pure.string(description),
        tx.pure.string(url),
        tx.object(SUI_CLOCK_OBJECT_ID),
        request
      ],
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.signer,
      transaction: tx,
    });

    return await this.client.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
      },
    });
  }

  async revokeAttestation(adminId: string, schemaId: string, attestationId: string): Promise<SuiTransactionBlockResponse> {
    const attestationRegistryId = getAttestationRegistryId(this.chain, this.network);
    
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::sas::revoke`,
      arguments: [
        tx.object(adminId),
        tx.object(attestationRegistryId),
        tx.object(schemaId),
        tx.object(attestationId),
      ],
    });

    return await this.client.signAndExecuteTransaction({
      signer: this.signer,
      transaction: tx,
    });
  }

  async revokeAttestationWithResolver(adminId: string, schemaId: string, attestationId: string, resolverModule: string): Promise<SuiTransactionBlockResponse> {
    const attestationRegistryId = getAttestationRegistryId(this.chain, this.network);
    
    const tx = new Transaction();
    
    const [request] = tx.moveCall(
      {
        target: `${this.packageId}::schema::start_revoke`,
        arguments: [
          tx.object(schemaId),
        ]
      }
    );

    tx.moveCall({
      target: `${resolverModule}::approve`,
      arguments: [
        tx.object(schemaId),
        request,
      ]
    });

    tx.moveCall({
      target: `${this.packageId}::sas::revoke_with_resolver`,
      arguments: [
        tx.object(adminId),
        tx.object(attestationRegistryId),
        tx.object(schemaId),
        tx.object(attestationId),
        request,
      ],
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.signer,
      transaction: tx,
    });

    return await this.client.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
      },
    });
  }

  async getAttestationRegistry(): Promise<AttestationRegistry> {
    return getAttestationRegistry(this.chain, this.network);
  }

  async getAttestation(id: string): Promise<SuiAttestation> {
    return getAttestation(id, this.chain, this.network);
  }
}

export async function getAttestationRegistry(chain: string, network: Network): Promise<AttestationRegistry> {
  const client = getClient(chain, network);
  const registryId = getAttestationRegistryId(chain, network);
  const response = await client.getObject({
    id: registryId,
    options: { showContent: true, showType: true },
  });

  if (response.error) {
    throw new Error(`Failed to fetch object: ${response.error}`);
  }

  const object = response.data as any;
  const fields = object.content.fields as any;

  return {
    id: object.objectId,
    version: {
      id: fields.inner.fields.id.id,
      version: fields.inner.fields.version,
    },
  };
}

export async function getAttestation(id: string, chain: string, network: Network): Promise<SuiAttestation> {
  const client = getClient(chain, network);
  const response = await client.getObject({
    id: id,
    options: {
      showContent: true,
      showType: true,
      showOwner: true,
      showPreviousTransaction: true
    },
  });

  if (response.error) {
    throw new Error(`Failed to fetch object: ${response.error}`);
  }

  const object = response.data;
  if (!object || !object.content || object.content.dataType !== 'moveObject') {
    throw new Error('Invalid object data');
  }

  const fields = object.content.fields as any;

  // Determine storage type (default to ON_CHAIN for backward compatibility)
  const storageType = fields.storage_type !== undefined 
    ? (fields.storage_type === 0 ? StorageType.ON_CHAIN : StorageType.OFF_CHAIN)
    : StorageType.ON_CHAIN; // Default for old attestations without storage_type

  // Parse data based on storage type
  let data: Uint8Array | undefined;
  if (storageType === StorageType.ON_CHAIN) {
    if (typeof fields.data === 'string') {
      data = Uint8Array.from(atob(fields.data), c => c.charCodeAt(0));
    } else if (Array.isArray(fields.data)) {
      data = new Uint8Array(fields.data);
    } else if (fields.data !== undefined) {
      // Handle empty data for on-chain storage
      data = new Uint8Array(0);
    }
  }

  // Parse off-chain storage fields
  let walrusSuiObjectId: string | undefined;
  let walrusBlobId: string | undefined;
  let dataHash: Uint8Array | undefined;
  let encrypted: boolean | undefined;
  let sealNonce: Uint8Array | undefined;
  let sealPolicyId: string | undefined;

  if (storageType === StorageType.OFF_CHAIN) {
    walrusSuiObjectId = fields.walrus_sui_object_id;
    
    // Parse walrus_blob_id (vector<u8> as bytes, convert to string)
    if (fields.walrus_blob_id) {
      if (typeof fields.walrus_blob_id === 'string') {
        walrusBlobId = fields.walrus_blob_id;
      } else if (Array.isArray(fields.walrus_blob_id)) {
        // Convert bytes to string (base64url)
        walrusBlobId = new TextDecoder().decode(new Uint8Array(fields.walrus_blob_id));
      }
    }
    
    if (fields.data_hash) {
      if (typeof fields.data_hash === 'string') {
        dataHash = Uint8Array.from(atob(fields.data_hash), c => c.charCodeAt(0));
      } else if (Array.isArray(fields.data_hash)) {
        dataHash = new Uint8Array(fields.data_hash);
      }
    }
    
    encrypted = fields.encrypted;
    
    // Handle Option<vector<u8>> for seal_nonce
    if (fields.seal_nonce) {
      if (typeof fields.seal_nonce === 'object' && fields.seal_nonce.fields) {
        // Option::some case
        const nonceValue = fields.seal_nonce.fields.value || fields.seal_nonce.fields;
        if (Array.isArray(nonceValue)) {
          sealNonce = new Uint8Array(nonceValue);
        }
      } else if (Array.isArray(fields.seal_nonce)) {
        sealNonce = new Uint8Array(fields.seal_nonce);
      }
    }
    
    // Handle Option<address> for seal_policy_id
    if (fields.seal_policy_id) {
      if (typeof fields.seal_policy_id === 'object' && fields.seal_policy_id.fields) {
        // Option::some case
        sealPolicyId = fields.seal_policy_id.fields.value || fields.seal_policy_id.fields;
      } else if (typeof fields.seal_policy_id === 'string') {
        sealPolicyId = fields.seal_policy_id;
      }
    }
  }

  return {
    attestationAddr: object.objectId,
    schemaAddr: fields.schema,
    ref_attestation: fields.ref_attestation,
    time: BigInt(fields.time),
    expiration_time: BigInt(fields.expiration_time),
    revocation_time: BigInt(0),
    revokable: fields.revokable,    
    attestor: fields.attestor,
    recipient: (object.owner as any).AddressOwner,
    storageType,
    data,
    walrusSuiObjectId,
    walrusBlobId,
    dataHash,
    encrypted,
    sealNonce,
    sealPolicyId,
    name: fields.name,
    description: fields.description,
    url: fields.url,
    txHash: object.previousTransaction || '',
  };
}

/**
 * Get attestation data (automatically handles both storage types)
 * @param attestationId Attestation ID
 * @param userAddress User address (required for Seal decryption)
 * @param chain Chain name
 * @param network Network
 * @param walrusClient Walrus client (required for OFF_CHAIN storage)
 * @param sealWrapper Seal wrapper (optional, required if data is encrypted)
 * @param signer Signer for Seal decryption (required if data is encrypted)
 * @param txBytes Transaction bytes that calls seal_approve* functions (required if data is encrypted)
 * @returns Attestation data
 */
export async function getAttestationData(
  attestationId: string,
  userAddress: string,
  chain: string,
  network: Network,
  walrusClient?: WalrusClient,
  sealWrapper?: SealWrapper,
  signer?: any, // Signer for Seal decryption
  txBytes?: Uint8Array // Transaction bytes that calls seal_approve* functions
): Promise<Uint8Array> {
  // Step 1: Get attestation from chain
  const attestation = await getAttestation(attestationId, chain, network);
  
  // Step 2: Handle based on storage type
  if (attestation.storageType === StorageType.ON_CHAIN) {
    // Method 1: On-chain storage, return data field directly
    if (!attestation.data) {
      throw new Error('Data not found in on-chain storage');
    }
    return attestation.data;
  } else {
    // Method 2: Off-chain storage (default: Walrus)
    if (!walrusClient || !attestation.walrusSuiObjectId || !attestation.dataHash) {
      throw new Error('Off-chain storage requires walrusClient and blob information');
    }
    
    // Step 2a: Download data from off-chain storage (default: Walrus)
    // Use walrusBlobId if available (direct), otherwise use suiObjectId
    let data: Uint8Array;
    if (attestation.walrusBlobId) {
      // Use blobId directly (base64url string)
      data = await walrusClient.downloadData(attestation.walrusBlobId, true);
    } else {
      // Fall back to suiObjectId (needs to fetch blobId from chain)
      data = await walrusClient.downloadData(attestation.walrusSuiObjectId, false);
    }
    
    // Step 2b: Decrypt if encrypted using Seal
    if (attestation.encrypted && sealWrapper && attestation.sealNonce) {
      if (!signer || !txBytes) {
        throw new Error(
          'Seal decryption requires signer and txBytes. ' +
          'Please create a SessionKey and provide txBytes that calls seal_approve* functions. ' +
          'For example usage, see: https://github.com/MystenLabs/seal/tree/main/examples'
        );
      }
      
      // Parse encrypted object to get package ID
      const { EncryptedObject } = await import('@mysten/seal');
      const encryptedObj = EncryptedObject.parse(data);
      const packageId = encryptedObj.packageId;
      
      // Create session key for Seal
      const sessionKey = await sealWrapper.createSessionKey(
        userAddress,
        packageId,
        signer,
        30 // 30 minutes TTL
      );
      
      // Decrypt using Seal
      data = await sealWrapper.decryptData(
        data,
        sessionKey,
        txBytes,
        true // checkShareConsistency
      );
    }
    
    // Step 2c: Verify data integrity
    // dataHash is calculated from ORIGINAL data (before encryption) using blake2b256
    // We verify by calculating hash of decrypted/retrieved data using blake2b256
    const { blake2b256 } = await import('./utils');
    const computedHash = blake2b256(data);
    if (!walrusClient.arraysEqual(computedHash, attestation.dataHash!)) {
      throw new Error('Data integrity verification failed: hash mismatch. Expected hash of original data, but computed hash does not match.');
    }
    
    return data;
  }
}

export async function getAttestations(chain: string, network: Network): Promise<SuiAttestation[]> {
  const client = getClient(chain, network);

  // Get the table id
  const tableId = await getAttestationRegistryTable(chain, network);

  // Get the table data
  const tableData = await client.getDynamicFields({
    parentId: tableId,
  });

  const attestationPromises = tableData.data.map(async (dataItem) => {
    // Get the table item
    const tableItem = await client.getObject({
      id: dataItem.objectId,
      options: { showContent: true, showType: true },
    });

    // key is the attestation id
    const attestationId = (tableItem.data?.content as any).fields.name;

    return getAttestation(attestationId, chain, network);
  });

  const attestations = await Promise.all(attestationPromises);

  return attestations;
}

export async function getAttestationRegistryTable(chain: string, network: Network): Promise<string> {
  const client = getClient(chain, network);
  const schemaRegistry = await getAttestationRegistry(chain, network);
  const res = await client.getDynamicFieldObject({
    parentId: schemaRegistry.version.id,
    name: {
      type: 'u64',
      value: schemaRegistry.version.version,
    },
  });
  return (res.data?.content as any).fields.value.fields.attestations_status.fields.id.id;
}