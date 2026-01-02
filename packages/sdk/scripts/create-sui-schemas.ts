import { schemaTemplates } from "./templates/schema-templates";
import { schemaInstances } from "./templates/schema-instances";
import { bcs } from '@mysten/bcs';
import { getKeypair } from '../src/sui/utils';
import { Schema } from '../src/sui/schema';
import { Sas } from "../src/sui/sas";
import { Codec } from '../src/codec';

const network = 'testnet';
const chain = 'sui';

async function main() {
  const keypair = getKeypair();
  const schema = new Schema(chain, network, keypair);
  const sas = new Sas(chain, network, keypair);

  for (const template of schemaTemplates) {
    const schemaItem = bcs.string().serialize(template.template).toBytes();
    const res = await schema.new(
      new Uint8Array(schemaItem),
      template.name,
      '',
      '',
      true
    );
    console.log(`Created schema template ${template.name}`, res);
    let schemaId = '';
    for (const created of res.effects?.created || []) {
      if (typeof created.owner === 'object' && 'Shared' in created.owner) {
        schemaId = created.reference.objectId;
        console.log('Created Schema:', created.reference.objectId);
      }
    }
    for (const instance of schemaInstances) {
      if (instance.name === template.name) {
        const schemaCodec = new Codec(template.template);
        const encodedItem = schemaCodec.encodeToBytes(instance.data as any);
        const res = await sas.attest(schemaId, '0x0', keypair.toSuiAddress(), BigInt(Date.now() + 1000 * 60 * 60 * 24), encodedItem, 'test', 'sui attest', 'wwww.google.com');
        console.log(`Created schema instance ${instance.name}`, res);
      }
    }
  }

  console.log('Done');
}

main().catch(console.error);
