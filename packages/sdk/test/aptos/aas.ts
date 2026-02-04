import { bcs } from '@mysten/bcs';
import { Account, Network, Ed25519PrivateKey, Hex} from "@aptos-labs/ts-sdk";
import { Aas } from "../../src/aptos/aas";
import { computeBlake2b256, downloadFromShelby, uploadToShelby, generateBlobName } from "../../src/aptos/shelby";
import { Codec } from "../../src/codec";
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

const privateKeyBytes = Hex.fromHexString(process.env.PRIVATE_KEY?.toString() || "").toUint8Array();
const privateKey = new Ed25519PrivateKey(privateKeyBytes)

const account = Account.fromPrivateKey({privateKey});
console.log('account', account.publicKey.toString());

const network = Network.TESTNET;
const aas = new Aas(account, 'aptos', network as any);

const schemaTemplate = "name: string, age: u64"
const codec = new Codec(schemaTemplate);

const schema = bcs.string().serialize(schemaTemplate).toBytes();

async function testCreateSchemaAndAttestation(): Promise<{ schemaAddress: string; schemaName: string }> {
  console.log('=== testCreateSchemaAndAttestation ===');
  const schemaName = "Name" + Date.now();
  let res = await aas.createSchema(
    schema,
    schemaName,
    "Description",
    "https://example.com",
    true,
    '0x0'
  )
  const events = (res as any).events;
  let schemaAddress = "";
  for (const event of events) {
    if (event.type.includes("SchemaCreated")) {
      schemaAddress = event.data.schema_address;
    }
  }
  console.log('Create schema address', schemaAddress);

  const createdSchema = await aas.getSchema(schemaAddress);
  console.log('Created schema', createdSchema);

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
    true,
    attestationRaw
  )

  const events2 = (res2 as any).events;
  let attestation_address;
  for (const event of events2) {
    if (event.type.includes("AttestationCreated")) {
      attestation_address = event.data.attestation_address;
    }
  }
  console.log('Attestation address', attestation_address);

  const attestation = await aas.getAttestation(attestation_address);
  console.log('Attestation', attestation);

  const decodedItem = codec.decodeFromBytes(attestation.data);
  console.log('Decoded item', decodedItem);

  const res3 = await aas.revokeAttestation(
    schemaAddress,
    attestation_address
  );
  if (res3.success) {
    console.log('revoke attestation success');
  } else {
    console.log('revoke attestation failed', res3);
  }

  return { schemaAddress, schemaName };
}

async function testCreateOffChainAttestation(schemaAddress: string, schemaName: string) {
  console.log('=== testCreateOffChainAttestation ===');

  const item = {
    name: "Bob",
    age: 42n,
  };
  const attestationRaw = codec.encodeToBytes(item);

  // Generate unique blob name using the SDK helper function
  const dataHash = computeBlake2b256(attestationRaw);
  const hashHex = Buffer.from(dataHash).toString('hex');
  const blobName = generateBlobName(schemaName, hashHex);

  const shelbyApiKey = process.env.SHELBY_API_KEY?.toString();

  if (!shelbyApiKey) {
    throw new Error('Missing SHELBY_API_KEY in env');
  }

  const uploadResult = await uploadToShelby({
    account,
    blobName,
    blobData: attestationRaw,
    apiKey: shelbyApiKey,
    network: Network.SHELBYNET,
  });

  console.log('Shelby upload result', uploadResult);

  const downloaded = await downloadFromShelby({
    account: uploadResult.account,
    blobName: uploadResult.blobName,
    apiKey: shelbyApiKey,
    network: Network.SHELBYNET,
  });

  const downloadedHash = computeBlake2b256(downloaded);
  if (Buffer.from(downloadedHash).toString('hex') !== hashHex) {
    throw new Error('Downloaded data hash mismatch');
  }

  const decodedOffChain = codec.decodeFromBytes(downloaded);
  if (decodedOffChain.name !== item.name || decodedOffChain.age !== item.age) {
    throw new Error(`Decoded off-chain data mismatch: ${JSON.stringify(decodedOffChain)}`);
  }

  // Pass the new fields: blobMerkleRoot and registerTxHash
  const res = await aas.createAttestationOffChain(
    account.accountAddress.toString(),
    schemaAddress,
    '0x0',
    0,
    true,
    uploadResult.dataHash,
    uploadResult.account,
    uploadResult.blobName,
    uploadResult.blobMerkleRoot,
    uploadResult.registerTxHash
  );

  const events = (res as any).events;
  let attestation_address;
  for (const event of events) {
    if (event.type.includes("AttestationCreated")) {
      attestation_address = event.data.attestation_address;
    }
  }
  console.log('Off-chain attestation address', attestation_address);

  const attestation = await aas.getAttestation(attestation_address);
  console.log('Off-chain attestation', attestation);
}

async function testCreateSchemaAndAttestationWithResolver() {
  console.log('=== testCreateSchemaAndAttestationWithResolver ===');
  let res = await aas.createSchema(
    schema,
    "Name" + Date.now(),
    "Description",
    "https://example.com",
    true,
    '0x0f6e0bf40111bc7efe17b4b249e09474bc3e25c9d2f2ce7524379d1d5c294ac6'
  )

  const events = (res as any).events;
  let schemaAddress = "";
  for (const event of events) {
    if (event.type.includes("SchemaCreated")) {
      schemaAddress = event.data.schema_address;
    }
  }
  console.log('Create schema address', schemaAddress);

  const createdSchema = await aas.getSchema(schemaAddress);
  console.log('Created schema', createdSchema);

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
    true,
    attestationRaw
  )

  const events2 = (res2 as any).events;
  let attestation_address;
  for (const event of events2) {
    if (event.type.includes("AttestationCreated")) {
      attestation_address = event.data.attestation_address;
    }
  }
  console.log('Attestation address', attestation_address);

  const attestation = await aas.getAttestation(attestation_address);
  console.log('Attestation', attestation);

  const decodedItem = codec.decodeFromBytes(attestation.data);
  console.log('Decoded item', decodedItem);

  const res3 = await aas.revokeAttestation(
    schemaAddress,
    attestation_address
  );
  if (res3.success) {
    console.log('revoke attestation success');
  } else {
    console.log('revoke attestation failed', res3);
  }
}

async function main() {
  const { schemaAddress, schemaName } = await testCreateSchemaAndAttestation();
  await testCreateOffChainAttestation(schemaAddress, schemaName);
  // await testCreateSchemaAndAttestationWithResolver();
}

main();
