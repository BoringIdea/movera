import { bcs } from '@mysten/bcs';
import { Account, Network, Ed25519PrivateKey, Hex} from "@aptos-labs/ts-sdk";
import { Aas } from "../../src/aptos/aas";
import { Codec } from "../../src/codec";
import dotenv from 'dotenv';

dotenv.config();

const privateKeyBytes = Hex.fromHexString(process.env.PRIVATE_KEY?.toString() || "").toUint8Array();
const privateKey = new Ed25519PrivateKey(privateKeyBytes);

const account = Account.fromPrivateKey({privateKey});
console.log('account', account.publicKey.toString());

const network = Network.CUSTOM;
const aas = new Aas(account, 'movement', network as any, 'https://aptos.testnet.porto.movementlabs.xyz/v1');

const schemaTemplate = "name: string, age: u64"
const codec = new Codec(schemaTemplate);

const schema = bcs.string().serialize(schemaTemplate).toBytes();

async function testCreateSchemaAndAttestation() {
  console.log('=== testCreateSchemaAndAttestation ===');
  let res = await aas.createSchema(
    schema,
    "Name" + Date.now(),
    "Description",
    "https://example.com",
    true,
    '0x0'
  )
  console.log('Create schema response', res);
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
  await testCreateSchemaAndAttestation();
  // await testCreateSchemaAndAttestationWithResolver();
}

main();