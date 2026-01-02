# Movera SDK

Move Attestation Service SDK - A TypeScript library for creating, managing, and verifying attestations on Sui and Aptos blockchains with support for decentralized storage and privacy protection.

## Overview

Movera SDK is a comprehensive TypeScript library that provides a unified interface for interacting with the Move Attestation Service on both Sui and Aptos blockchains. The SDK includes support for:

- **Dual Storage Modes**: On-chain and off-chain (Walrus) storage options
- **Privacy Protection**: Seal encryption for sensitive attestation data
- **Data Integrity**: Blake2b-256 hash verification
- **Schema-based Encoding**: Type-safe data encoding and decoding with Codec

## Supported Chains

| Chain | Status | Features |
|-------|--------|----------|
| Sui | Testnet ✅ | On-chain storage, Off-chain storage (Walrus), Seal encryption |
| Aptos | Testnet ✅ | On-chain storage |

**Note**: Off-chain storage and Seal encryption are currently only available for Sui.

## Installation

Install the SDK using npm:

```bash
npm install @movera/sdk
```

Or using yarn:

```bash
yarn add @movera/sdk
```

## Quick Start

### Basic Usage (Sui - On-Chain Storage)

```typescript
import { Sas, Codec, StorageType, getKeypair, getClient, Network } from '@movera/sdk';
import { bcs } from '@mysten/bcs';

const network: Network = 'testnet';
const chain = 'sui';
const keypair = getKeypair();
const sas = new Sas(chain, network, keypair);

// 1. Create Schema
const schemaTemplate = 'name: string, age: u64';
const schemaCodec = new Codec(schemaTemplate);
const schemaBytes = bcs.string().serialize(schemaTemplate).toBytes();

const res = await sas.registerSchema(
  new Uint8Array(schemaBytes),
  'My Schema',
  'Description',
  'https://example.com',
  true
);

// Extract schema ID from transaction response
let schemaId = '';
for (const created of res.effects?.created || []) {
  if (typeof created.owner === 'object' && 'Shared' in created.owner) {
    schemaId = created.reference.objectId;
    break;
  }
}

// 2. Create Attestation (On-Chain)
const item = {
  name: "Alice",
  age: 30n,
};
const encodedItem = schemaCodec.encodeToBytes(item);

const result = await sas.attest(
  schemaId,
  '0x0',
  keypair.toSuiAddress(),
  BigInt(Date.now() + 1000 * 60 * 60 * 24), // expiration time
  encodedItem,
  'Test Attestation',
  'Description',
  'https://example.com',
  StorageType.ON_CHAIN // On-chain storage
);

console.log('Attestation created:', result);
```

### Off-Chain Storage with Walrus

```typescript
import { Sas, Codec, StorageType, WalrusClient, getKeypair, getClient, blake2b256 } from '@movera/sdk';
import { bcs } from '@mysten/bcs';

const network: Network = 'testnet';
const chain = 'sui';
const keypair = getKeypair();
const sas = new Sas(chain, network, keypair);
const client = getClient(chain, network);

// Initialize Walrus client
const walrusClient = new WalrusClient(client, {
  network,
  uploadRelay: {
    host: 'https://upload-relay.testnet.walrus.space',
    sendTip: {
      max: 1_000, // Maximum tip in MIST
    },
  },
  storageNodeClientOptions: {
    timeout: 60_000, // 60 seconds timeout
  },
});

// Create Schema (same as before)
const schemaTemplate = 'name: string, school: string, degree: string';
const schemaCodec = new Codec(schemaTemplate);
// ... (create schema)

// Prepare attestation data
const item = {
  name: "Alice Chen",
  school: "Stanford University",
  degree: "Computer Science",
};
const encodedItem = schemaCodec.encodeToBytes(item);

// Calculate data hash (Blake2b-256)
const dataHash = blake2b256(encodedItem);

// Upload data to Walrus
const uploadResult = await walrusClient.uploadData(
  encodedItem,
  keypair,
  3, // epochs
  false // deletable
);

// Create attestation with off-chain storage
const result = await sas.attest(
  schemaId,
  '0x0',
  keypair.toSuiAddress(),
  BigInt(Date.now() + 1000 * 60 * 60 * 24),
  encodedItem, // Original data (not stored, only used for reference)
  'Alice\'s Diploma',
  'Stanford University Computer Science Degree',
  'https://stanford.edu',
  StorageType.OFF_CHAIN, // Off-chain storage
  uploadResult.suiObjectId, // Walrus Sui Object ID
  uploadResult.blobId, // Walrus Blob ID (base64url)
  dataHash, // Data hash for integrity verification
  false, // not encrypted
  undefined, // no seal nonce
  undefined // no seal policy ID
);

// Retrieve attestation data
import { getAttestationData } from '@movera/sdk';
const retrievedData = await getAttestationData(
  attestationId,
  keypair.toSuiAddress(),
  chain,
  network,
  walrusClient
);

// Decode data
const decoded = schemaCodec.decodeFromBytes(retrievedData);
console.log('Decoded data:', decoded);
```

### Encrypted Storage with Seal

```typescript
import { 
  Sas, Codec, StorageType, WalrusClient, SealWrapper, 
  computeSealKeyId, SEAL_KEY_SERVERS, getPackageId,
  getKeypair, getClient, blake2b256 
} from '@movera/sdk';
import { bcs } from '@mysten/bcs';
import { SessionKey } from '@mysten/seal';

const network: Network = 'testnet';
const chain = 'sui';
const keypair = getKeypair();
const sas = new Sas(chain, network, keypair);
const client = getClient(chain, network);

// Initialize clients
const walrusClient = new WalrusClient(client, { network });
const packageId = getPackageId(chain, network);

// Use testnet Seal key servers
const sealWrapper = new SealWrapper(client, {
  serverConfigs: SEAL_KEY_SERVERS.testnet.map((objectId) => ({
    objectId,
    weight: 1,
  })),
  verifyKeyServers: false, // false for testnet
  timeout: 10_000,
});

// Create Schema (same as before)
// ... (create schema)

// Prepare attestation data
const item = {
  name: "Bob Smith",
  medical_record_id: "MR-2024-001",
  diagnosis: "Hypertension",
};
const encodedItem = schemaCodec.encodeToBytes(item);

// Step 1: Generate nonce for Seal encryption
const attestorAddress = keypair.toSuiAddress();
const sealNonce = crypto.getRandomValues(new Uint8Array(16));

// Step 2: Compute Seal key ID (matching contract's compute_key_id)
const sealIdHex = computeSealKeyId(attestorAddress, sealNonce);

// Step 3: Encrypt data with Seal
const sealPolicy = {
  packageId,
  id: sealIdHex, // [attestor][nonce]
  threshold: 1,
  keyServers: SEAL_KEY_SERVERS.testnet.map((objectId) => ({
    objectId,
    weight: 1,
  })),
};

const { encryptedData } = await sealWrapper.encryptData(encodedItem, sealPolicy);

// Step 4: Calculate data hash of ORIGINAL data (before encryption)
const dataHash = blake2b256(encodedItem);

// Step 5: Upload encrypted data to Walrus
const uploadResult = await walrusClient.uploadData(encryptedData, keypair, 3, false);

// Step 6: Create encrypted attestation
const result = await sas.attest(
  schemaId,
  '0x0',
  recipientAddress, // Recipient address (owner of the attestation)
  BigInt(Date.now() + 1000 * 60 * 60 * 24),
  encodedItem, // Original data (not stored, only used for reference)
  'Medical Record',
  'Encrypted medical record',
  'https://hospital.example.com',
  StorageType.OFF_CHAIN,
  uploadResult.suiObjectId,
  uploadResult.blobId,
  dataHash,
  true, // encrypted
  sealNonce, // Pass the nonce
  undefined // seal_policy_id is optional
);

// Retrieve and decrypt attestation data (as recipient)
import { getAttestationData } from '@movera/sdk';
import { Transaction } from '@mysten/sui/transactions';

// Create transaction bytes for seal_approve
const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::seal_access::seal_approve`,
  arguments: [
    tx.pure.vector('u8', Array.from(Buffer.from(sealIdHex, 'hex'))),
    tx.object(attestationId),
  ],
});
const txBytes = await tx.build({ client, onlyTransactionKind: true });

// Create SessionKey for Seal
const sessionKey = await sealWrapper.createSessionKey(
  recipientAddress,
  packageId,
  keypair,
  30 // TTL in minutes
);

// Decrypt data
const decryptedData = await sealWrapper.decryptData(
  encryptedData,
  sessionKey,
  txBytes,
  true // checkShareConsistency
);

// Verify data integrity
const hash = blake2b256(decryptedData);
if (!arraysEqual(hash, dataHash)) {
  throw new Error('Data integrity verification failed');
}

// Decode decrypted data
const decoded = schemaCodec.decodeFromBytes(decryptedData);
console.log('Decrypted data:', decoded);
```

### Aptos Chain

```typescript
import { Aas, Codec } from '@movera/sdk';
import { Account, Network, Ed25519PrivateKey, Hex } from "@aptos-labs/ts-sdk";
import { bcs } from '@mysten/bcs';

const privateKeyBytes = Hex.fromHexString(process.env.PRIVATE_KEY || "").toUint8Array();
const privateKey = new Ed25519PrivateKey(privateKeyBytes);
const account = Account.fromPrivateKey({ privateKey });
const network = Network.TESTNET;

const aas = new Aas(account, 'aptos', network);

// Create Schema
const schemaTemplate = "name: string, age: u64";
const codec = new Codec(schemaTemplate);
const schema = bcs.string().serialize(schemaTemplate).toBytes();

const res = await aas.createSchema(
  schema,
  "Name",
  "Description",
  "Url",
  false,
  '0x0'
);

// Extract schema address from events
const events = (res as any).events;
let schemaAddress = "";
for (const event of events) {
  if (event.type.includes("SchemaCreated")) {
    schemaAddress = event.data.schema_address;
    break;
  }
}

// Create Attestation
const item = {
  name: "Alice",
  age: 30n,
};
const attestationRaw = codec.encodeToBytes(item);

const res2 = await aas.createAttestation(
  account.accountAddress.toString(),
  schemaAddress,
  '0x0',
  0,
  false,
  attestationRaw
);

console.log('Attestation created:', res2);
```

## Core Classes

### Sas (Sui Attestation Service)

Main class for interacting with Sui attestations.

```typescript
import { Sas, getKeypair } from '@movera/sdk';

const sas = new Sas('sui', 'testnet', getKeypair());

// Register a schema
await sas.registerSchema(schemaBytes, name, description, url, revokable);

// Create attestation (on-chain or off-chain)
await sas.attest(
  schemaId,
  refAttestationId,
  recipient,
  expirationTime,
  data,
  name,
  description,
  url,
  storageType, // StorageType.ON_CHAIN or StorageType.OFF_CHAIN
  walrusSuiObjectId, // Required for OFF_CHAIN
  walrusBlobId, // Required for OFF_CHAIN
  dataHash, // Required for OFF_CHAIN
  encrypted, // Optional, for encrypted storage
  sealNonce, // Optional, required if encrypted
  sealPolicyId // Optional, for other Seal patterns
);

// Get attestation
const attestation = await sas.getAttestation(attestationId);

// Revoke attestation
await sas.revokeAttestation(adminId, schemaId, attestationId);
```

### Codec

Schema-based data encoder and decoder.

```typescript
import { Codec } from '@movera/sdk';

// Create codec with schema string
// Format: "field1: type1, field2: type2, ..."
// Supported types: u8, u16, u32, u64, u128, u256, bool, String, Address, Vector<Type>
const codec = new Codec('name: string, age: u64, tags: Vector<string>');

// Encode data to JSON string
const item = {
  name: "Alice",
  age: 30n,
  tags: ["developer", "engineer"],
};
const encodedString = codec.encode(item);

// Encode data to Uint8Array (BCS encoded)
const encodedBytes = codec.encodeToBytes(item);

// Decode from JSON string
const decodedItem = codec.decode(encodedString);

// Decode from Uint8Array
const decodedItemFromBytes = codec.decodeFromBytes(encodedBytes);

// Get schema fields
const fields = codec.schemaItem();
```

**Schema String Format**:
- Format: `"field1: type1, field2: type2, ..."`
- Types are case-insensitive: `string` → `String`, `address` → `Address`
- Vector types: `Vector<string>`, `Vector<u64>`, etc.
- Example: `"name: string, age: u64, tags: Vector<string>, address: address"`

### WalrusClient

Client for interacting with Walrus decentralized storage.

```typescript
import { WalrusClient } from '@movera/sdk';

const walrusClient = new WalrusClient(suiClient, {
  network: 'testnet',
  uploadRelay: {
    host: 'https://upload-relay.testnet.walrus.space',
    sendTip: {
      max: 1_000,
    },
  },
  storageNodeClientOptions: {
    timeout: 60_000, // 60 seconds
  },
});

// Upload data to Walrus
const result = await walrusClient.uploadData(
  data, // Uint8Array
  signer, // Signer
  3, // epochs (optional, default: 3)
  false, // deletable (optional, default: false)
  owner // owner address (optional, defaults to signer)
);
// Returns: { suiObjectId: string, blobId: string }

// Download data from Walrus
const data = await walrusClient.downloadData(
  id, // Sui object ID or blob ID (base64url)
  isBlobIdBase64url // true if id is blob ID, false if Sui object ID
);

// Get blob ID from Sui object ID
const blobId = await walrusClient.getBlobIdFromObjectId(suiObjectId);

// Calculate Blake2b-256 hash
const hash = await walrusClient.calculateHash(data);
```

### SealWrapper

Wrapper for Seal privacy protection (encryption/decryption).

```typescript
import { SealWrapper, SEAL_KEY_SERVERS, computeSealKeyId } from '@movera/sdk';
import { SessionKey } from '@mysten/seal';

const sealWrapper = new SealWrapper(suiClient, {
  serverConfigs: SEAL_KEY_SERVERS.testnet.map((objectId) => ({
    objectId,
    weight: 1,
  })),
  verifyKeyServers: false, // false for testnet
  timeout: 10_000,
});

// Encrypt data
const packageId = getPackageId('sui', 'testnet');
const attestorAddress = '0x...';
const nonce = crypto.getRandomValues(new Uint8Array(16));
const sealIdHex = computeSealKeyId(attestorAddress, nonce);

const policy = {
  packageId,
  id: sealIdHex, // [attestor][nonce]
  threshold: 1,
  keyServers: SEAL_KEY_SERVERS.testnet.map((objectId) => ({
    objectId,
    weight: 1,
  })),
};

const { encryptedData } = await sealWrapper.encryptData(data, policy);

// Decrypt data (as recipient)
const sessionKey = await sealWrapper.createSessionKey(
  recipientAddress,
  packageId,
  signer,
  30 // TTL in minutes
);

// Create transaction bytes that calls seal_approve
const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::seal_access::seal_approve`,
  arguments: [
    tx.pure.vector('u8', Array.from(Buffer.from(sealIdHex, 'hex'))),
    tx.object(attestationId),
  ],
});
const txBytes = await tx.build({ client, onlyTransactionKind: true });

const decryptedData = await sealWrapper.decryptData(
  encryptedData,
  sessionKey,
  txBytes,
  true // checkShareConsistency
);
```

## Utilities

### getAttestationData

Automatically retrieves and decrypts attestation data based on storage type.

```typescript
import { getAttestationData } from '@movera/sdk';

// For on-chain attestations
const data = await getAttestationData(
  attestationId,
  userAddress,
  chain,
  network
);

// For off-chain attestations
const data = await getAttestationData(
  attestationId,
  userAddress,
  chain,
  network,
  walrusClient // Required for off-chain
);

// For encrypted off-chain attestations
const data = await getAttestationData(
  attestationId,
  userAddress,
  chain,
  network,
  walrusClient,
  sealWrapper,
  signer,
  txBytes // Transaction bytes that calls seal_approve
);
```

### Utility Functions

```typescript
import { 
  getClient, 
  getKeypair, 
  getPackageId, 
  getAttestationRegistryId,
  blake2b256,
  computeSealKeyId 
} from '@movera/sdk';

// Get Sui client
const client = getClient('sui', 'testnet');

// Get keypair from environment variable or generate new
const keypair = getKeypair(); // Reads SECRET_KEY from env, or generates new

// Get package ID
const packageId = getPackageId('sui', 'testnet');

// Get registry IDs
const attestationRegistryId = getAttestationRegistryId('sui', 'testnet');

// Calculate Blake2b-256 hash (matches Sui's hash::blake2b256)
const hash = blake2b256(data);

// Compute Seal key ID (matching contract's compute_key_id)
const sealId = computeSealKeyId(attestorAddress, nonce);
```

## Storage Types

### StorageType.ON_CHAIN

Traditional on-chain storage. All data is stored directly on the Sui blockchain.

**Usage**:
- Suitable for small data
- Fully transparent and verifiable
- Higher gas costs for large data

### StorageType.OFF_CHAIN

Off-chain storage using Walrus decentralized storage.

**Usage**:
- Suitable for large data
- Lower gas costs (only metadata stored on-chain)
- Data stored in Walrus, hash stored on-chain for integrity

**Requirements**:
- `walrusSuiObjectId`: Sui object ID of the Walrus blob
- `walrusBlobId`: Walrus blob ID (base64url string)
- `dataHash`: Blake2b-256 hash of the original data

### Encrypted Storage

Combines off-chain storage with Seal encryption for privacy protection.

**Usage**:
- Suitable for sensitive data (medical records, salary proofs, etc.)
- Data is encrypted before upload to Walrus
- Only authorized users (attestation recipients) can decrypt

**Flow**:
1. Generate a random nonce
2. Compute Seal key ID: `[attestor][nonce]`
3. Encrypt data using Seal
4. Calculate hash of original data (before encryption)
5. Upload encrypted data to Walrus
6. Create attestation with encrypted flag and nonce

**Decryption**:
1. Create SessionKey as recipient
2. Create transaction bytes that call `seal_approve`
3. Seal key server verifies on-chain access policy
4. Decrypt data using Seal
5. Verify data integrity with stored hash

## Constants

### SEAL_KEY_SERVERS

Default Seal key server IDs for each network.

```typescript
import { SEAL_KEY_SERVERS } from '@movera/sdk';

// Testnet key servers (Open mode, freely available)
const testnetServers = SEAL_KEY_SERVERS.testnet;

// For mainnet, configure your own key servers
// See: https://seal-docs.wal.app/Pricing/
```

## Type Definitions

### SuiAttestation

```typescript
interface SuiAttestation {
  attestationAddr: string;
  schemaAddr: string;
  ref_attestation: string;
  time: bigint;
  expiration_time: bigint;
  revocation_time: bigint;
  revokable: boolean;
  attestor: string;
  recipient: string;
  
  // Storage type
  storageType: StorageType;
  
  // On-chain storage (if storageType === ON_CHAIN)
  data?: Uint8Array;
  
  // Off-chain storage (if storageType === OFF_CHAIN)
  walrusSuiObjectId?: string;
  walrusBlobId?: string;
  dataHash?: Uint8Array;
  encrypted?: boolean;
  sealNonce?: Uint8Array;
  sealPolicyId?: string;
  
  // Metadata
  name: string;
  description: string;
  url: string;
  txHash?: string;
}
```

### StorageType

```typescript
enum StorageType {
  ON_CHAIN = 0,
  OFF_CHAIN = 1, // Default: Walrus
}
```

## Examples

See the `test/` directory for complete examples:

- `test/sui/sas.ts`: Comprehensive examples including on-chain, off-chain, and encrypted storage
- `test/aptos/aas.ts`: Aptos attestation examples
- `test/codec.ts`: Codec usage examples


## License

See LICENSE file in the repository root.
