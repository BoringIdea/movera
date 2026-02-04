# 🔥 Quickstart

Get up and running with Movera in minutes! This guide will walk you through creating your first attestation using the Movera Protocol.

## Prerequisites

- Node.js 20+ installed
- Yarn or npm package manager
- Sui or Aptos testnet access
- Basic knowledge of TypeScript/JavaScript

## Installation

Install the Movera SDK:

```bash
npm install @movera/sdk
# or
yarn add @movera/sdk
```

## Example: Create Your First Attestation (Sui)

### 1. Set Up Environment

Create a new project and install dependencies:

```bash
mkdir my-movera-app
cd my-movera-app
npm init -y
npm install @movera/sdk @mysten/sui @mysten/bcs
```

### 2. Create Schema

```typescript
import { Sas, Codec, StorageType, getKeypair } from '@movera/sdk';
import { bcs } from '@mysten/bcs';

const network = 'testnet';
const chain = 'sui';
const keypair = getKeypair(); // Or load from env variable
const sas = new Sas(chain, network, keypair);

// Define schema template
const schemaTemplate = 'name: string, age: u64, email: string';
const schemaCodec = new Codec(schemaTemplate);
const schemaBytes = bcs.string().serialize(schemaTemplate).toBytes();

// Register schema
const res = await sas.registerSchema(
  new Uint8Array(schemaBytes),
  'User Profile',
  'User profile information',
  'https://example.com',
  true // revokable
);

// Extract schema ID from response
let schemaId = '';
for (const created of res.effects?.created || []) {
  if (typeof created.owner === 'object' && 'Shared' in created.owner) {
    schemaId = created.reference.objectId;
    break;
  }
}

console.log('Schema ID:', schemaId);
```

### 3. Create Attestation

```typescript
// Prepare attestation data
const item = {
  name: "Alice",
  age: 30n,
  email: "alice@example.com"
};

// Encode data according to schema
const encodedItem = schemaCodec.encodeToBytes(item);

// Create attestation (on-chain storage)
const result = await sas.attest(
  schemaId,
  '0x0', // ref_attestation
  keypair.toSuiAddress(), // recipient
  BigInt(Date.now() + 1000 * 60 * 60 * 24), // expiration_time (24 hours)
  encodedItem,
  'Alice\'s Profile',
  'User profile attestation',
  'https://example.com',
  StorageType.ON_CHAIN // on-chain storage
);

// Extract attestation ID
let attestationId = '';
for (const createdObject of result.effects?.created || []) {
  if (typeof createdObject.owner === 'object' && 'AddressOwner' in createdObject.owner) {
    attestationId = createdObject.reference.objectId;
    break;
  }
}

console.log('Attestation ID:', attestationId);
```

### 4. Retrieve Attestation

```typescript
import { getAttestation } from '@movera/sdk';

// Get attestation from chain
const attestation = await getAttestation(attestationId, chain, network);

console.log('Attestation:', attestation);
console.log('Attestor:', attestation.attestor);
console.log('Recipient:', attestation.recipient);

// Decode data
const decodedData = schemaCodec.decodeFromBytes(attestation.data!);
console.log('Decoded data:', decodedData);
```

## Example: Create Off-Chain Attestation (Sui)

For larger data or cost optimization, use off-chain storage:

```typescript
import { WalrusClient, blake2b256, getClient, getAttestationData } from '@movera/sdk';

// Initialize Walrus client
const client = getClient(chain, network);
const walrusClient = new WalrusClient(client, {
  network,
  uploadRelay: {
    host: 'https://upload-relay.testnet.walrus.space',
    sendTip: { max: 1_000 },
  },
  storageNodeClientOptions: {
    timeout: 60_000,
  },
});

// Prepare data
const item = {
  name: "Bob",
  bio: "A long biography...", // Large data
  achievements: ["Achievement 1", "Achievement 2"]
};
const encodedItem = schemaCodec.encodeToBytes(item);

// Calculate data hash
const dataHash = blake2b256(encodedItem);

// Upload to Walrus
const uploadResult = await walrusClient.uploadData(encodedItem, keypair, 3, false);

// Create off-chain attestation
const result = await sas.attest(
  schemaId,
  '0x0',
  keypair.toSuiAddress(),
  BigInt(Date.now() + 1000 * 60 * 60 * 24),
  encodedItem, // Original data (not stored, only for reference)
  'Bob\'s Profile',
  'User profile with large data',
  'https://example.com',
  StorageType.OFF_CHAIN,
  uploadResult.suiObjectId,
  uploadResult.blobId,
  dataHash,
  false, // not encrypted
  undefined, // no seal nonce
  undefined // no seal policy
);

// Retrieve data
const retrievedData = await getAttestationData(
  attestationId,
  keypair.toSuiAddress(),
  chain,
  network,
  walrusClient
);

const decodedData = schemaCodec.decodeFromBytes(retrievedData);
console.log('Decoded data:', decodedData);
```

## Example: Create Encrypted Attestation (Sui)

For sensitive data, use Seal encryption:

```typescript
import { SealWrapper, computeSealKeyId, SEAL_KEY_SERVERS, getPackageId } from '@movera/sdk';
import { SessionKey } from '@mysten/seal';

// Initialize Seal wrapper
const sealWrapper = new SealWrapper(client, {
  serverConfigs: SEAL_KEY_SERVERS.testnet.map((objectId) => ({
    objectId,
    weight: 1,
  })),
  verifyKeyServers: false,
  timeout: 10_000,
});

const packageId = getPackageId(chain, network);
const attestorAddress = keypair.toSuiAddress();

// Generate nonce for Seal
const sealNonce = crypto.getRandomValues(new Uint8Array(16));
const sealIdHex = computeSealKeyId(attestorAddress, sealNonce);

// Encrypt data
const sealPolicy = {
  packageId,
  id: sealIdHex,
  threshold: 1,
  keyServers: SEAL_KEY_SERVERS.testnet.map((objectId) => ({
    objectId,
    weight: 1,
  })),
};

const { encryptedData } = await sealWrapper.encryptData(encodedItem, sealPolicy);

// Calculate hash of original data (before encryption)
const dataHash = blake2b256(encodedItem);

// Upload encrypted data to Walrus
const uploadResult = await walrusClient.uploadData(encryptedData, keypair, 3, false);

// Create encrypted attestation
const result = await sas.attest(
  schemaId,
  '0x0',
  recipientAddress, // Recipient who can decrypt
  BigInt(Date.now() + 1000 * 60 * 60 * 24),
  encodedItem, // Original data (not stored)
  'Sensitive Profile',
  'Encrypted user profile',
  'https://example.com',
  StorageType.OFF_CHAIN,
  uploadResult.suiObjectId,
  uploadResult.blobId,
  dataHash,
  true, // encrypted
  sealNonce, // Seal nonce
  undefined // seal policy ID
);
```

## Example: Create Attestation (Aptos)

For Aptos chain:

```typescript
import { Aas, Codec } from '@movera/sdk';
import { Account, Network, Ed25519PrivateKey, Hex } from "@aptos-labs/ts-sdk";
import { bcs } from '@mysten/bcs';

// Set up account
const privateKeyBytes = Hex.fromHexString(process.env.PRIVATE_KEY || "").toUint8Array();
const privateKey = new Ed25519PrivateKey(privateKeyBytes);
const account = Account.fromPrivateKey({ privateKey });
const network = Network.TESTNET;

const aas = new Aas(account, 'aptos', network);

// Create schema
const schemaTemplate = "name: string, age: u64";
const codec = new Codec(schemaTemplate);
const schema = bcs.string().serialize(schemaTemplate).toBytes();

const res = await aas.createSchema(
  schema,
  "User Profile",
  "Description",
  "https://example.com",
  false, // revokable
  '0x0' // resolver
);

// Extract schema address
const events = (res as any).events;
let schemaAddress = "";
for (const event of events) {
  if (event.type.includes("SchemaCreated")) {
    schemaAddress = event.data.schema_address;
    break;
  }
}

// Create attestation
const item = {
  name: "Alice",
  age: 30n,
};
const attestationRaw = codec.encodeToBytes(item);

const res2 = await aas.createAttestation(
  account.accountAddress.toString(),
  schemaAddress,
  '0x0',
  0, // expiration_time
  false, // revokable
  attestationRaw
);

console.log('Attestation created:', res2);
```

## Example: Create Off-Chain Attestation (Aptos + Shelby)

```typescript
import { Aas, Codec, uploadToShelby, computeBlake2b256 } from '@movera/sdk';
import { Account, Network, Ed25519PrivateKey, Hex } from "@aptos-labs/ts-sdk";
import { bcs } from '@mysten/bcs';

// Set up account (same as above)
const privateKeyBytes = Hex.fromHexString(process.env.PRIVATE_KEY || "").toUint8Array();
const privateKey = new Ed25519PrivateKey(privateKeyBytes);
const account = Account.fromPrivateKey({ privateKey });
const aas = new Aas(account, 'aptos', Network.TESTNET);

// Create schema (same as above)
const schemaTemplate = "name: string, age: u64";
const codec = new Codec(schemaTemplate);
const schema = bcs.string().serialize(schemaTemplate).toBytes();
const res = await aas.createSchema(schema, "User Profile", "Description", "https://example.com", false, '0x0');

// Extract schema address
const events = (res as any).events;
let schemaAddress = "";
for (const event of events) {
  if (event.type.includes("SchemaCreated")) {
    schemaAddress = event.data.schema_address;
    break;
  }
}

// Prepare attestation data
const item = { name: "Alice", age: 30n };
const attestationRaw = codec.encodeToBytes(item);

// Compute hash and blobName
const dataHash = computeBlake2b256(attestationRaw);
const dataHashHex = Buffer.from(dataHash).toString('hex');
const blobName = `movera/user-profile/${dataHashHex}`;

// Upload to Shelby (shelbynet)
const upload = await uploadToShelby({
  account,
  blobName,
  blobData: attestationRaw,
  apiKey: process.env.SHELBY_API_KEY,
  network: Network.SHELBYNET,
});

// Create off-chain attestation
const res2 = await aas.createAttestationOffChain(
  account.accountAddress.toString(),
  schemaAddress,
  '0x0',
  0, // expiration_time
  false, // revokable
  upload.dataHash,
  upload.account,
  upload.blobName,
  upload.blobMerkleRoot,
  upload.registerTxHash
);

console.log('Off-chain attestation created:', res2);
```

## Next Steps

- Learn about [Core Concepts](../Basics/Core-Concepts.md)
- Explore the [Architecture](../Basics/Architecture.md)
- Check out the [SDK Documentation](../SDK)
- Explore the [Contracts Documentation](../Contracts) for smart contract details

---

**Next**: [Core Concepts](../Basics/Core-Concepts.md) →
