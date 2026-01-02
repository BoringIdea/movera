import { bcs } from '@mysten/bcs';
import { Aas } from "../src/aptos/aas";
import { Codec } from "../src/codec";
import { Account, Network, Ed25519PrivateKey, Hex } from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';
import { schemaTemplates } from "./templates/schema-templates";
import { schemaInstances } from "./templates/schema-instances";

dotenv.config();

const privateKeyBytes = Hex.fromHexString(process.env.PRIVATE_KEY?.toString() || "").toUint8Array();
const privateKey = new Ed25519PrivateKey(privateKeyBytes)

const account = Account.fromPrivateKey({ privateKey });

const network = Network.TESTNET;
const aas = new Aas(account, 'aptos', network as any);

async function main() {

  for (let i = 1; i < 10; i++) {
    const schemaTemplate = schemaTemplates[i];
    const schema = bcs.string().serialize(schemaTemplate.template).toBytes();

    let res = await aas.createSchema(
      schema,
      schemaTemplate.name,
      "Description",
      "Url",
      false,
      '0x0'
    )
    const events = (res as any).events;
    let schemaAddress = "";
    for (const event of events) {
      if (event.type.includes("SchemaCreated")) {
        schemaAddress = event.data.schema_address;
      }
    }
    console.log('schemaAddress', schemaAddress);

    const createdSchema = await aas.getSchema(schemaAddress);
    console.log('createdSchema', createdSchema);

    for (const instance of schemaInstances) {
      if (instance.name === schemaTemplate.name) {
        const codec = new Codec(schemaTemplate.template);

        const attestationRaw = codec.encodeToBytes(instance.data as any);

        const res2 = await aas.createAttestation(
          account.accountAddress.toString(),
          schemaAddress,
          '0x00',
          0,
          false,
          attestationRaw
        )

        const events2 = (res2 as any).events;
        let attestationAddress;
        for (const event of events2) {
          if (event.type.includes("AttestationCreated")) {
            attestationAddress = event.data.attestation_address;
          }
        }
        console.log('attestationAddress', attestationAddress);

        const attestation = await aas.getAttestation(attestationAddress);
        console.log('attestation', attestation);

        const decodedItem = codec.decodeFromBytes(attestation.data);
        console.log('decodedItem', decodedItem);
      }
    }
  }
}

main();
