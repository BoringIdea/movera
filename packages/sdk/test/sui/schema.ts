import { bcs } from '@mysten/bcs';
import { getKeypair } from '../../src/sui/utils';
import { Schema, getSchemas } from '../../src/sui/schema';

const network = 'testnet';
const chain = 'sui';

const keypair = getKeypair();
const schema = new Schema(chain, network, keypair);

const template = 'name: string, age: u64';
const schemaItem = bcs.string().serialize(template).toBytes();

async function testCreateSchema() {
  console.log('======= testCreateSchema ======');
  const res = await schema.new(
    new Uint8Array(schemaItem),
    'Test' + Date.now(),
    'Description',
    'https://example.com',
    true
  );

  for (const created of res.effects?.created || []) {
    if (typeof created.owner === 'object' && 'Shared' in created.owner) {
      console.log('Create Schema:', created.reference.objectId);
    }
  }
}

async function testCreateSchemaWithResolver() {
  console.log('======= testCreateSchemaWithResolver ======');
  const res = await schema.newWithResolver(
    new Uint8Array(schemaItem),
    'Test' + Date.now(),
    'Description',
    'https://example.com',
    true,
    '0x82fb50a598c3b23dce575b1f34c2d7df060a443823194c7edc769949e472604c::blocklist'
  );

  for (const created of res.effects?.created || []) {
    if (typeof created.owner === 'object' && 'Shared' in created.owner) {
      console.log('Create Schema:', created.reference.objectId);
    }
  }
}

async function testGetAllSchemas() {
  console.log('======= testGetAllSchemas ======');
  const schemas = await getSchemas(chain, network);
  console.log('Schemas:', schemas);
}

async function main() {
  await testCreateSchema();
  await testCreateSchemaWithResolver();
  await testGetAllSchemas();
}

main().catch(
  console.error
)