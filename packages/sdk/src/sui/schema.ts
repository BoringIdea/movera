import {
  SuiClient,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getClient, getPackageId, getSchemaRegistryId, Network } from './utils';
import { SuiSchema, SchemaRegistry } from './types';

export class Schema {
  private client: SuiClient;
  private signer: Ed25519Keypair;
  private packageId: string;
  private network: Network;
  private chain: string;

  constructor(chain: string, network: Network, signer: Ed25519Keypair) {
    this.chain = chain;
    this.client = getClient(chain, network);
    this.signer = signer;
    this.packageId = getPackageId(chain, network);
    this.network = network;
  }

  // Create a new schema
  public async new(
    schema: Uint8Array,
    name: string,
    description: string,
    url: string,
    revokable: boolean,
  ): Promise<SuiTransactionBlockResponse> {
    const schemaRegistryId = getSchemaRegistryId(this.chain, this.network);
    const tx = new Transaction();

    const adminCap = tx.moveCall({
      target: `${this.packageId}::schema::new`,
      arguments: [
        tx.object(schemaRegistryId),
        tx.pure.vector('u8', schema),
        tx.pure.string(name),
        tx.pure.string(description),
        tx.pure.string(url),
        tx.pure.bool(revokable)
      ],
    });

    tx.transferObjects([adminCap], this.signer.toSuiAddress());

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

  // Create a new schema with a resolver
  async newWithResolver(
    schema: Uint8Array,
    name: string,
    description: string,
    url: string,
    revokable: boolean,
    resolverModule: string,
  ): Promise<SuiTransactionBlockResponse> {
    const schemaRegistryId = getSchemaRegistryId(this.chain, this.network);
    
    const tx = new Transaction();

    const [resolverBuilder, adminCap, schemaRecord] = tx.moveCall({
      target: `${this.packageId}::schema::new_with_resolver`,
      arguments: [
        tx.object(schemaRegistryId),
        tx.pure.vector('u8', schema),
        tx.pure.string(name),
        tx.pure.string(description),
        tx.pure.string(url),
        tx.pure.bool(revokable)
      ],
    });

    tx.transferObjects([adminCap], this.signer.toSuiAddress());
    
    tx.moveCall({
      target: `${resolverModule}::add`,
      arguments: [
        schemaRecord,
        resolverBuilder, 
      ],
    });
    
    tx.moveCall({
      target: `${this.packageId}::schema::add_resolver`,
      arguments: [
        schemaRecord,
        resolverBuilder,
      ],
    });

    tx.moveCall({
      target: `${this.packageId}::schema::share_schema`,
      arguments: [
        schemaRecord,
      ],
    });

    tx.setGasBudget(100000000);

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

  async getSchemaRegistry(): Promise<SchemaRegistry> {
    return await getSchemaRegistry(this.chain, this.network);
  }

  async getSchema(id: string): Promise<SuiSchema> {
    return await getSchema(id, this.chain, this.network);
  }
}

export async function getSchema(id: string, chain: string, network: Network): Promise<SuiSchema> {
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

  let resolver: any | null = null;
  if (fields.resolver && fields.resolver.fields) {
    resolver = {
      rules: fields.resolver.fields.rules,
      config: fields.resolver.fields.config
    };
  }

  return {
    schemaAddr: object.objectId,
    schema: new Uint8Array(fields.schema),
    resolver: resolver,
    name: fields.name,
    description: fields.description,
    url: fields.url,
    creator: fields.creator,
    revokable: fields.revokable,
    createdAt: fields.created_at,
    txHash: object.previousTransaction || '',
  };
}

export async function getSchemaRegistry(chain: string, network: Network): Promise<SchemaRegistry> {
  const client = getClient(chain, network);
  const schemaRegistryId = getSchemaRegistryId(chain, network);
  const response = await client.getObject({
    id: schemaRegistryId,
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

export async function getSchemas(chain: string, network: Network): Promise<SuiSchema[]> {
  const client = getClient(chain, network);

  // Get the table id
  const tableId = await getSchemaRegistryTable(chain, network);

  // Get the table data
  const tableData = await client.getDynamicFields({
    parentId: tableId,
  });
  console.log('tableData', tableData);

  const schemaPromises = tableData.data.map(async (dataItem) => {
    // Get the table item
    const tableItem = await client.getObject({
      id: dataItem.objectId,
      options: { showContent: true, showType: true },
    });

    // key is the schema id
    const schemaId = (tableItem.data?.content as any).fields.name;

    // Get the schema record
    return getSchema(schemaId, chain, network);
  });

  const schemas = await Promise.all(schemaPromises);

  return schemas;
}

export async function getSchemaRegistryTable(chain: string, network: Network): Promise<string> {
  const client = getClient(chain, network);
  const schemaRegistry = await getSchemaRegistry(chain, network);
  const res = await client.getDynamicFieldObject({
    parentId: schemaRegistry.version.id,
    name: {
      type: 'u64',
      value: schemaRegistry.version.version,
    },
  });
  return (res.data?.content as any).fields.value.fields.schema_records.fields.id.id;
}
