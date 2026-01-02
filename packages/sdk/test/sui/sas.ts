import { Sas, getAttestations, getAttestationRegistryTable, getAttestationData } from '../../src/sui/sas';
import { Codec } from '../../src/codec';
import { getKeypair, getClient } from '../../src/sui/utils';
import { bcs } from '@mysten/bcs';
import { StorageType, WalrusClient, SealWrapper, computeSealKeyId } from '../../src/sui';
import { getPackageId } from '../../src/sui/utils';

const network = 'testnet';
const chain = 'sui';

const keypair = getKeypair();
const sas = new Sas(chain, network, keypair);

const schemaCodec = new Codec('name: string, age: u64');

const template = 'name: string, age: u64';
const schemaItem = bcs.string().serialize(template).toBytes();

const item = {
  name: "Alice",
  age: 30n,
};
const encodedItem = schemaCodec.encodeToBytes(item);

async function testAttest() {
  console.log('======= testAttest ======');
  const res = await sas.registerSchema(
    new Uint8Array(schemaItem),
    'Test' + Date.now(),
    'Description',
    'https://example.com',
    true
  );

  let schemaId = '';
  let adminCapId = '';
  for (const created of res.effects?.created || []) {
    if (typeof created.owner === 'object' && 'Shared' in created.owner) {
      schemaId = created.reference.objectId;
      console.log('Create Schema:', schemaId);
    }

    if (typeof created.owner === 'object' && 'AddressOwner' in created.owner) {
      adminCapId = created.reference.objectId;
      console.log('Created admin cap:', created.reference.objectId);
    }
  }

  const result = await sas.attest(
    schemaId,
    '0x0',
    keypair.toSuiAddress(),
    BigInt(Date.now() + 1000 * 60 * 60 * 24),
    encodedItem,
    'Test',
    'sui attest',
    'wwww.google.com'
  );

  let attestationId = '';
  for (const createdObject of result.effects?.created || []) {
    if (typeof createdObject.owner === 'object' && 'AddressOwner' in createdObject.owner) {
      attestationId = createdObject.reference.objectId;
      console.log('Created attestation:', createdObject.reference.objectId);
    }
  }

  // revoke attestation
  const revokeResult = await sas.revokeAttestation(
    adminCapId,
    schemaId,
    attestationId
  );
  console.log('Revoke attestation result:', revokeResult);
}

async function testAttestWithResolver() {
  console.log('======= testAttestWithResolver ======');
  const res = await sas.registerSchemaWithResolver(
    new Uint8Array(schemaItem),
    'Test' + Date.now(),
    'Description',
    'https://example.com',
    true,
    '0x82fb50a598c3b23dce575b1f34c2d7df060a443823194c7edc769949e472604c::blocklist'
  );

  let schemaId = '';
  let adminCapId = '';
  for (const created of res.effects?.created || []) {
    if (typeof created.owner === 'object' && 'Shared' in created.owner) {
      schemaId = created.reference.objectId;
      console.log('Create Schema:', schemaId);
    }

    if (typeof created.owner === 'object' && 'AddressOwner' in created.owner) {
      adminCapId = created.reference.objectId;
      console.log('Created admin cap:', created.reference.objectId);
    }
  }

  const result = await sas.attestWithResolver(
    schemaId,
    '0x0',
    keypair.toSuiAddress(),
    BigInt(Date.now() + 1000 * 60 * 60 * 24),
    encodedItem,
    'Test',
    'sui attest',
    'wwww.google.com',
    '0x82fb50a598c3b23dce575b1f34c2d7df060a443823194c7edc769949e472604c::blocklist'
  );

  let attestationId = '';
  for (const createdObject of result.effects?.created || []) {
    if (typeof createdObject.owner === 'object' && 'AddressOwner' in createdObject.owner) {
      attestationId = createdObject.reference.objectId;
      console.log('Created attestation:', createdObject.reference.objectId);
    }
  }
  
  // revoke attestation
  const revokeResult = await sas.revokeAttestation(
    adminCapId,
    schemaId,
    attestationId
  );
  console.log('Revoke attestation result:', revokeResult);
}

async function testGetAllAttestations() {
  console.log('======= testGetAllAttestations ======');
  const attestations = await getAttestations(chain, network);
  console.log('Attestations:', attestations);
}

async function testAttestOffChain() {
  console.log('======= testAttestOffChain ======');
  const res = await sas.registerSchema(
    new Uint8Array(schemaItem),
    'Test OffChain' + Date.now(),
    'Description',
    'https://example.com',
    true
  );

  let schemaId = '';
  for (const created of res.effects?.created || []) {
    if (typeof created.owner === 'object' && 'Shared' in created.owner) {
      schemaId = created.reference.objectId;
      console.log('Create Schema:', schemaId);
      break;
    }
  }

  if (!schemaId) {
    throw new Error('Failed to create schema');
  }

  // Initialize Walrus client
  // Use upload relay for better reliability on testnet
  const client = getClient(chain, network);
  const walrusClient = new WalrusClient(client, { 
    network,
    // Use upload relay to reduce request count and improve reliability
    // This reduces ~2200 requests to just a few requests handled by the relay server
    uploadRelay: {
      host: 'https://upload-relay.testnet.walrus.space',
      sendTip: {
        max: 1_000, // Maximum tip in MIST (optional, relay will determine actual tip needed)
      },
    },
    storageNodeClientOptions: {
      timeout: 60_000, // 60 seconds timeout for slow nodes
      onError: (error) => {
        // Optional: log errors for debugging
        // console.warn('Walrus storage node error:', error);
      },
    },
  });

  // Upload data to Walrus with retry logic
  const epochs = 3;
  let walrusSuiObjectId: string | undefined;
  let walrusBlobId: string | undefined;
  let retries = 3;
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting Walrus upload (attempt ${i + 1}/${retries})...`);
      const uploadResult = await walrusClient.uploadData(encodedItem, keypair, epochs, false);
      walrusSuiObjectId = uploadResult.suiObjectId;
      walrusBlobId = uploadResult.blobId;
      console.log('Uploaded to Walrus:');
      console.log('  Sui Object ID:', walrusSuiObjectId);
      console.log('  Blob ID (base64url):', walrusBlobId);
      break;
    } catch (error: any) {
      lastError = error;
      console.warn(`Upload attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  if (!walrusSuiObjectId || !walrusBlobId) {
    throw new Error(`Failed to upload to Walrus after ${retries} attempts. Last error: ${lastError?.message}. This may indicate that Walrus testnet nodes are temporarily unavailable. Please try again later.`);
  }

  // Calculate data hash of ORIGINAL data using blake2b256
  // This matches Sui's hash::blake2b256 and is used to verify data integrity
  const { blake2b256 } = await import('../../src/sui/utils');
  const dataHash = blake2b256(encodedItem);
  console.log('Data hash (of original data):', Buffer.from(dataHash).toString('hex'));

  // Create attestation with off-chain storage
  const result = await sas.attest(
    schemaId,
    '0x0',
    keypair.toSuiAddress(),
    BigInt(Date.now() + 1000 * 60 * 60 * 24),
    encodedItem, // This will be ignored for off-chain storage
    'Test OffChain',
    'sui attest off-chain',
    'https://example.com',
    StorageType.OFF_CHAIN,
    walrusSuiObjectId,
    walrusBlobId,
    dataHash,
    false, // not encrypted
    undefined, // no seal nonce (not encrypted)
    undefined // no seal policy
  );

  let attestationId = '';
  for (const createdObject of result.effects?.created || []) {
    if (typeof createdObject.owner === 'object' && 'AddressOwner' in createdObject.owner) {
      attestationId = createdObject.reference.objectId;
      console.log('Created off-chain attestation:', createdObject.reference.objectId);
      break;
    }
  }

  if (!attestationId) {
    throw new Error('Failed to create off-chain attestation');
  }

  // Test getAttestationData for off-chain storage
  const retrievedData = await getAttestationData(
    attestationId,
    keypair.toSuiAddress(),
    chain,
    network,
    walrusClient
  );

  console.log('Retrieved data from off-chain storage:');
  const decoded = schemaCodec.decodeFromBytes(retrievedData);
  console.log('Decoded data:', decoded);

  // Verify data matches
  if (decoded.name !== item.name || decoded.age !== item.age) {
    throw new Error('Retrieved data does not match original data');
  }

  console.log('✅ Off-chain attestation test passed');
}

async function testAttestOffChainEncrypted() {
  console.log('======= testAttestOffChainEncrypted ======');
  const res = await sas.registerSchema(
    new Uint8Array(schemaItem),
    'Test OffChain Encrypted' + Date.now(),
    'Description',
    'https://example.com',
    true
  );

  let schemaId = '';
  let adminCapId = '';
  for (const created of res.effects?.created || []) {
    if (typeof created.owner === 'object' && 'Shared' in created.owner) {
      schemaId = created.reference.objectId;
      console.log('Create Schema:', schemaId);
    }

    if (typeof created.owner === 'object' && 'AddressOwner' in created.owner) {
      adminCapId = created.reference.objectId;
      console.log('Created admin cap:', created.reference.objectId);
    }
  }

  if (!schemaId) {
    throw new Error('Failed to create schema');
  }

  // Initialize clients
  const client = getClient(chain, network);
  const walrusClient = new WalrusClient(client, { 
    network,
    uploadRelay: {
      host: 'https://upload-relay.testnet.walrus.space',
      sendTip: {
        max: 1_000,
      },
    },
  });

  // Use Mysten Labs testnet Seal key servers (Open mode, freely available)
  // These are the default testnet key servers provided by Mysten Labs
  // See: https://github.com/MystenLabs/seal/blob/main/docs/Pricing.md
  const testnetKeyServerIds = [
    '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
    '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
  ];

  const sealWrapper = new SealWrapper(client, {
    serverConfigs: testnetKeyServerIds.map((objectId) => ({
      objectId,
      weight: 1,
    })),
    verifyKeyServers: false, // Set to false for testnet to avoid verification overhead
    timeout: 10_000,
  });

  const packageId = getPackageId(chain, network);
  const attestorAddress = keypair.toSuiAddress();
  
  // Step 1: Generate nonce for Seal encryption
  // Using nonce instead of attestation_id allows us to encrypt BEFORE creating the attestation
  console.log('Step 1: Generating nonce for Seal encryption...');
  const sealNonce = crypto.getRandomValues(new Uint8Array(16));
  console.log('Generated nonce (hex):', Buffer.from(sealNonce).toString('hex'));
  
  // Step 2: Compute Seal key ID using nonce (matching contract's compute_key_id)
  const sealIdHex = computeSealKeyId(attestorAddress, sealNonce);
  console.log('Seal ID (without packageId):', sealIdHex);
  console.log('Full Seal ID will be: [packageId][attestor][nonce]');
  console.log('This matches seal_access.move::compute_key_id exactly');
  
  const sealPolicy = {
    packageId,
    id: sealIdHex, // Seal ID without packageId prefix: [attestor][nonce]
    threshold: 1, // Require at least 1 key server response
    keyServers: testnetKeyServerIds.map((objectId) => ({
      objectId,
      weight: 1,
    })),
  };

  // Step 3: Encrypt data with Seal using nonce
  console.log('Step 3: Encrypting data with Seal using nonce...');
  const { encryptedData } = await sealWrapper.encryptData(encodedItem, sealPolicy);
  console.log('Encrypted data length:', encryptedData.length);

  // Step 4: Calculate data hash of ORIGINAL data (before encryption)
  // This hash is stored on-chain and used to verify decrypted data integrity
  // Use blake2b256 to match Sui's hash::blake2b256
  const { blake2b256 } = await import('../../src/sui/utils');
  const dataHash = blake2b256(encodedItem);
  console.log('Data hash (of original data):', Buffer.from(dataHash).toString('hex'));
  
  // Step 5: Upload encrypted data to Walrus
  console.log('Step 5: Uploading encrypted data to Walrus...');
  const uploadResult = await walrusClient.uploadData(encryptedData, keypair, 3, false);
  const walrusSuiObjectId = uploadResult.suiObjectId;
  const walrusBlobId = uploadResult.blobId;
  console.log('Uploaded to Walrus:');
  console.log('  Sui Object ID:', walrusSuiObjectId);
  console.log('  Blob ID (base64url):', walrusBlobId);

  // Step 6: Create the encrypted attestation with nonce
  console.log('Step 6: Creating encrypted off-chain attestation with nonce...');
  const result = await sas.attest(
    schemaId,
    '0x0',
    keypair.toSuiAddress(),
    BigInt(Date.now() + 1000 * 60 * 60 * 24),
    encodedItem, // Original data (for reference, not stored)
    'Test OffChain Encrypted',
    'sui attest off-chain encrypted',
    'https://example.com',
    StorageType.OFF_CHAIN,
    walrusSuiObjectId,
    walrusBlobId,
    dataHash,
    true, // encrypted
    sealNonce, // Pass the nonce for Seal decryption
    undefined // seal_policy_id is optional (for other patterns)
  );
  
  // Get the attestation ID from the final attestation
  let attestationId = '';
  for (const createdObject of result.effects?.created || []) {
    if (typeof createdObject.owner === 'object' && 'AddressOwner' in createdObject.owner) {
      attestationId = createdObject.reference.objectId;
      break;
    }
  }
  
  if (!attestationId) {
    throw new Error('Failed to create attestation');
  }
  
  console.log('Created attestation ID:', attestationId);
  
  // Verify that the Seal ID matches the contract's expected key ID
  // Contract uses: compute_key_id(attestor, nonce) = [attestor][nonce]
  const expectedSealId = computeSealKeyId(attestorAddress, sealNonce);
  if (expectedSealId !== sealIdHex) {
    throw new Error(`Seal ID mismatch! Expected: ${expectedSealId}, Got: ${sealIdHex}`);
  }
  
  console.log('✅ Seal ID verification: Match!');
  console.log('   The Seal ID matches the contract\'s compute_key_id exactly');
  console.log('   Contract will use: compute_key_id(attestor, nonce)');
  console.log('   Seal ID used: [packageId][attestor][nonce]');
  
  console.log('✅ Encrypted attestation test passed');
  console.log('Note: To decrypt, use seal_approve with Seal ID: [packageId][attestor][nonce]');
  console.log('Note: The nonce is stored in the attestation, so decryption can use it to compute the Seal ID');
  console.log('Note: Seal key servers are using default testnet servers (Open mode, freely available)');
}

async function testGetAttestationDataOnChain() {
  console.log('======= testGetAttestationDataOnChain ======');
  // First create an on-chain attestation
  const res = await sas.registerSchema(
    new Uint8Array(schemaItem),
    'Test GetData' + Date.now(),
    'Description',
    'https://example.com',
    true
  );

  let schemaId = '';
  for (const created of res.effects?.created || []) {
    if (typeof created.owner === 'object' && 'Shared' in created.owner) {
      schemaId = created.reference.objectId;
      console.log('Create Schema:', schemaId);
      break;
    }
  }

  if (!schemaId) {
    throw new Error('Failed to create schema');
  }

  const result = await sas.attest(
    schemaId,
    '0x0',
    keypair.toSuiAddress(),
    BigInt(Date.now() + 1000 * 60 * 60 * 24),
    encodedItem,
    'Test GetData',
    'sui attest',
    'https://example.com',
    StorageType.ON_CHAIN
  );

  let attestationId = '';
  for (const createdObject of result.effects?.created || []) {
    if (typeof createdObject.owner === 'object' && 'AddressOwner' in createdObject.owner) {
      attestationId = createdObject.reference.objectId;
      console.log('Created on-chain attestation:', createdObject.reference.objectId);
      break;
    }
  }

  if (!attestationId) {
    throw new Error('Failed to create attestation');
  }

  // Test getAttestationData for on-chain storage
  const retrievedData = await getAttestationData(
    attestationId,
    keypair.toSuiAddress(),
    chain,
    network
  );

  console.log('Retrieved data from on-chain storage:');
  const decoded = schemaCodec.decodeFromBytes(retrievedData);
  console.log('Decoded data:', decoded);

  // Verify data matches
  if (decoded.name !== item.name || decoded.age !== item.age) {
    throw new Error('Retrieved data does not match original data');
  }

  console.log('✅ On-chain getAttestationData test passed');
}

async function main() {
  try {
    await testAttest();
    await testAttestWithResolver();
    await testGetAllAttestations();
    await testAttestOffChain();
    await testGetAttestationDataOnChain();
    await testAttestOffChainEncrypted();
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

main().catch(
  console.error
)






