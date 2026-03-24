import { Injectable, OnModuleInit } from '@nestjs/common';
import { Account, Aptos, AptosConfig, ClientConfig, Ed25519PrivateKey, Hex, Network } from '@aptos-labs/ts-sdk';
import { db } from '../db/db';
import { aptos_schemas, aptos_attestations } from '../db/schema';
import { sql, eq, desc, or, like } from 'drizzle-orm';
import { GraphQLService, Schema, Attestation, AttestationWithSchema } from './api/graphql';
import { PaginatedData } from '../common';

type NewAptosSchema = typeof aptos_schemas.$inferInsert;
type NewAptosAttestation = typeof aptos_attestations.$inferInsert;

const APTOS_ADDRESS = process.env.APTOS_PACKAGE_ADDRESS;
const SHELBY_NETWORK = 'SHELBYNET' as unknown as Network;

async function loadMoveraSdk() {
  return import('@movera/sdk');
}

@Injectable()
export class AptosService implements OnModuleInit {
  private aptosClient: Aptos;
  private graphqlService: GraphQLService;

  constructor() {
    const clientConfig: ClientConfig = {
      API_KEY: process.env.APTOS_API_KEY,
    };
    this.aptosClient = new Aptos(
      new AptosConfig({
        network: Network.TESTNET,
        clientConfig,
        fullnode: process.env.APTOS_FULLNODE_URL,
      }),
    );
    
    // Initialize GraphQL service with the endpoint URL and admin secret
    const graphqlUrl = process.env.APTOS_GRAPHQL_ENDPOINT_URL;
    const adminSecret = process.env.HASURA_ADMIN_SECRET;
    
    if (!graphqlUrl) {
      throw new Error('APTOS_GRAPHQL_ENDPOINT_URL is not set');
    }

    console.log('APTOS_GRAPHQL_ENDPOINT_URL', graphqlUrl);
    console.log('HASURA_ADMIN_SECRET', adminSecret);
    
    this.graphqlService = new GraphQLService(graphqlUrl, adminSecret);
  }

  onModuleInit() {
    this.startListening();
  }

  private async startListening() {
    // Replace the while loop with a single call to the GraphQL service
  }

  async attestationCreatedEvents() {
    const attestationCnt = await this.attestationCount();
    const result = await this.aptosClient.queryIndexer<{
      events: Array<{ data: any; transaction_version: string }>;
    }>({
      query: {
        query: `
          query GetAttestationCreatedEvents($event_type: String!, $offset: Int!, $limit: Int!) {
            events(
              where: { indexed_type: { _eq: $event_type } }
              offset: $offset
              limit: $limit
              order_by: { transaction_version: asc }
            ) {
              data
              transaction_version
            }
          }
        `,
        variables: {
          event_type: `${APTOS_ADDRESS}::attestation::AttestationCreated`,
          offset: attestationCnt,
          limit: 100,
        },
      },
    });
    const events = result.events || [];

    if (events.length > 0) {
      console.log('Attestation created events', events);
      for (const event of events) {
        try {
        const txInfo = await this.aptosClient.getTransactionByVersion({
          ledgerVersion: BigInt(event.transaction_version),
        });
        const txHash = txInfo.hash;

        const attestation = {
          address: event.data.attestation_address,
          schema: event.data.schema,
          ref_attestation: event.data.ref_attestation,
          time: event.data.time,
          expiration_time: event.data.expiration_time,
          revocation_time: '0',
          revokable: event.data.revokable ?? false,
          attestor: event.data.attestor,
          recipient: event.data.recipient,
          storage_type: event.data.storage_type ?? 0,
          data: event.data.data,
          data_hash: event.data.data_hash ?? null,
          shelby_account: event.data.shelby_account ?? null,
          shelby_blob_name: event.data.shelby_blob_name ?? null,
          shelby_blob_merkle_root: event.data.shelby_blob_merkle_root ?? null,
          shelby_register_tx_hash: event.data.shelby_register_tx_hash ?? null,
          tx_hash: txHash,
        };

        if (await this.findAttestationByAddress(attestation.address)) {
          continue;
        }

          await this.createAttestation(attestation);
        } catch (error) {
          console.error('Error creating attestation:', error);
        }
      }
    }
  }

  async attestationRevokedEvents() {
    const revokedCnt = await this.revokedCount();
    const result = await this.aptosClient.queryIndexer<{
      events: Array<{ data: any; transaction_version: string }>;
    }>({
      query: {
        query: `
          query GetAttestationRevokedEvents($event_type: String!, $offset: Int!, $limit: Int!) {
            events(
              where: { indexed_type: { _eq: $event_type } }
              offset: $offset
              limit: $limit
              order_by: { transaction_version: asc }
            ) {
              data
              transaction_version
            }
          }
        `,
        variables: {
          event_type: `${APTOS_ADDRESS}::attestation::AttestationRevoked`,
          offset: revokedCnt,
          limit: 100,
        },
      },
    });
    const events = result.events || [];

    if (events.length > 0) {
      for (const event of events) {
        await this.revokeAttestation(
          event.data.attestation_address,
          event.data.revocation_time.toString(),
        );
      }
    }
  }

  async schemaCreatedEvents() {
    const schemaCnt = await this.schemaCount();
    const result = await this.aptosClient.queryIndexer<{
      events: Array<{ data: any; transaction_version: string }>;
    }>({
      query: {
        query: `
          query GetSchemaCreatedEvents($event_type: String!, $offset: Int!, $limit: Int!) {
            events(
              where: { indexed_type: { _eq: $event_type } }
              offset: $offset
              limit: $limit
              order_by: { transaction_version: asc }
            ) {
              data
              transaction_version
            }
          }
        `,
        variables: {
          event_type: `${APTOS_ADDRESS}::schema::SchemaCreated`,
          offset: schemaCnt,
          limit: 100,
        },
      },
    });
    const events = result.events || [];

    if (events.length > 0) {
      console.log('Schema created events', events);
      for (const event of events) {
        try {
        const txInfo = await this.aptosClient.getTransactionByVersion({
          ledgerVersion: BigInt(event.transaction_version),
        });
        const txHash = txInfo.hash;

        const aptosSchema = {
          address: event.data.schema_address,
          name: event.data.name,
          description: event.data.description,
          url: event.data.url,
          creator: event.data.creator,
          created_at: event.data.created_at,
          schema: event.data.schema,
          revokable: event.data.revokable,
          resolver: event.data.resolver,
          tx_hash: txHash,
        };

        if (await this.findSchemaByAddress(aptosSchema.address)) {
          continue;
          }
          await this.createSchema(aptosSchema);
        } catch (error) {
          console.error('Error creating schema:', error);
        }
      }
    }
  }

  async createSchema(data: NewAptosSchema) {
    await db.insert(aptos_schemas).values(data);
  }

  async schemaCount() {
    const count = await db.select({ count: sql`count(*)` }).from(aptos_schemas);
    return count[0].count as number;
  }

  async getSchemas(offset: number, limit: number) {
    return await db
      .select({
        id: aptos_schemas.id,
        address: aptos_schemas.address,
        name: aptos_schemas.name,
        schema: aptos_schemas.schema,
        revokable: aptos_schemas.revokable,
        resolver: aptos_schemas.resolver,
        created_at: aptos_schemas.created_at,
        attestation_cnt: sql<number>`COUNT(${aptos_attestations.id})`,
      })
      .from(aptos_schemas)
      .leftJoin(
        aptos_attestations,
        eq(aptos_attestations.schema, aptos_schemas.address),
      )
      .groupBy(
        aptos_schemas.id,
        aptos_schemas.address,
        aptos_schemas.name,
        aptos_schemas.schema,
        aptos_schemas.revokable,
        aptos_schemas.resolver,
        aptos_schemas.created_at,
      )
      .limit(limit)
      .offset(offset)
      .orderBy(desc(aptos_schemas.id));
  }

  async findSchemaByAddress(address: string) {
    const res = await db
      .select({
        id: aptos_schemas.id,
        address: aptos_schemas.address,
        name: aptos_schemas.name,
        schema: aptos_schemas.schema,
        revokable: aptos_schemas.revokable,
        resolver: aptos_schemas.resolver,
        creator: aptos_schemas.creator,
        created_at: aptos_schemas.created_at,
        tx_hash: aptos_schemas.tx_hash,
        attestation_cnt: sql<number>`COUNT(${aptos_attestations.id})`,
      })
      .from(aptos_schemas)
      .leftJoin(
        aptos_attestations,
        eq(aptos_attestations.schema, aptos_schemas.address),
      )
      .where(eq(aptos_schemas.address, address))
      .groupBy(
        aptos_schemas.id,
        aptos_schemas.address,
        aptos_schemas.name,
        aptos_schemas.schema,
        aptos_schemas.revokable,
        aptos_schemas.resolver,
        aptos_schemas.creator,
        aptos_schemas.created_at,
        aptos_schemas.tx_hash,
      );
    return res[0];
  }

  async searchSchema(searchInput: string) {
    const res = await db
      .select()
      .from(aptos_schemas)
      .where(
        or(
          eq(sql`CAST(${aptos_schemas.id} AS TEXT)`, searchInput),
          eq(aptos_schemas.address, searchInput),
        ),
      );
    return res;
  }

  async createAttestation(data: NewAptosAttestation) {
    await db.insert(aptos_attestations).values(data);
  }

  async revokeAttestation(address: string, time: string) {
    await db
      .update(aptos_attestations)
      .set({ revocation_time: time })
      .where(eq(aptos_attestations.address, address));
  }

  async attestationCount() {
    const count = await db
      .select({ count: sql`count(*)` })
      .from(aptos_attestations);

    return count[0].count as number;
  }

  async revokedCount() {
    const count = await db
      .select({ count: sql`count(*)` })
      .from(aptos_attestations)
      .where(sql`revocation_time != '0'`);

    return count[0].count as number;
  }

  async getAttestations(offset: number, limit: number) {
    const attestations = await db
      .select()
      .from(aptos_attestations)
      .offset(offset)
      .limit(limit)
      .orderBy(desc(aptos_attestations.id));
    return attestations;
  }

  async getAttestationsWithSchemas(offset: number, limit: number) {
    const attestations = await db
      .select({
        // attestation fields
        id: aptos_attestations.id,
        address: aptos_attestations.address,
        schema: aptos_attestations.schema,
        time: aptos_attestations.time,
        attestor: aptos_attestations.attestor,
        recipient: aptos_attestations.recipient,
        // schema fields
        schema_id: aptos_schemas.id,
        schema_name: aptos_schemas.name,
        schema_address: aptos_schemas.address,
      })
      .from(aptos_attestations)
      .leftJoin(
        aptos_schemas,
        eq(aptos_attestations.schema, aptos_schemas.address),
      )
      .offset(offset)
      .limit(limit)
      .orderBy(desc(aptos_attestations.id));
    return attestations;
  }

  async getAttestationsBySchema(schema: string, offset: number, limit: number) {
    const attestations = await db
      .select({
        // attestation fields
        id: aptos_attestations.id,
        address: aptos_attestations.address,
        schema: aptos_attestations.schema,
        time: aptos_attestations.time,
        attestor: aptos_attestations.attestor,
        recipient: aptos_attestations.recipient,
        // schema fields
        schema_id: aptos_schemas.id,
        schema_name: aptos_schemas.name,
        schema_address: aptos_schemas.address,
      })
      .from(aptos_attestations)
      .leftJoin(
        aptos_schemas,
        eq(aptos_attestations.schema, aptos_schemas.address),
      )
      .offset(offset)
      .limit(limit)
      .where(eq(aptos_schemas.address, schema))
      .orderBy(desc(aptos_attestations.id));
    return attestations;
  }

  async getAttestationsByUser(address: string, offset: number, limit: number) {
    const attestations = await db
      .select({
        // attestation fields
        id: aptos_attestations.id,
        address: aptos_attestations.address,
        schema: aptos_attestations.schema,
        time: aptos_attestations.time,
        attestor: aptos_attestations.attestor,
        recipient: aptos_attestations.recipient,
        // schema fields
        schema_id: aptos_schemas.id,
        schema_name: aptos_schemas.name,
        schema_address: aptos_schemas.address,
      })
      .from(aptos_attestations)
      .leftJoin(
        aptos_schemas,
        eq(aptos_attestations.schema, aptos_schemas.address),
      )
      .offset(offset)
      .limit(limit)
      .where(
        or(
          eq(aptos_attestations.attestor, address),
          eq(aptos_attestations.recipient, address),
        ),
      )
      .orderBy(desc(aptos_attestations.id));
    return attestations;
  }

  async findAttestationByAddress(address: string) {
    const res = await db
      .select()
      .from(aptos_attestations)
      .where(eq(aptos_attestations.address, address));
    return res[0];
  }

  async getAttestationAndSchema(attestationAddress: string) {
    const res = await db
      .select({
        // attestation fields
        id: aptos_attestations.id,
        address: aptos_attestations.address,
        schema: aptos_attestations.schema,
        ref_attestation: aptos_attestations.ref_attestation,
        time: aptos_attestations.time,
        expiration_time: aptos_attestations.expiration_time,
        revocation_time: aptos_attestations.revocation_time,
        attestor: aptos_attestations.attestor,
        recipient: aptos_attestations.recipient,
        storage_type: aptos_attestations.storage_type,
        data: aptos_attestations.data,
        data_hash: aptos_attestations.data_hash,
        shelby_account: aptos_attestations.shelby_account,
        shelby_blob_name: aptos_attestations.shelby_blob_name,
        shelby_blob_merkle_root: aptos_attestations.shelby_blob_merkle_root,
        shelby_register_tx_hash: aptos_attestations.shelby_register_tx_hash,
        tx_hash: aptos_attestations.tx_hash,
        // schema fields
        schema_id: aptos_schemas.id,
        schema_name: aptos_schemas.name,
        schema_address: aptos_schemas.address,
        schema_data: aptos_schemas.schema,
      })
      .from(aptos_attestations)
      .leftJoin(
        aptos_schemas,
        eq(aptos_attestations.schema, aptos_schemas.address),
      )
      .where(eq(aptos_attestations.address, attestationAddress));

    return res[0];
  }

  async getSchemaCreatorCnt() {
    const result = await db
      .select({
        count: sql`COUNT(DISTINCT ${aptos_schemas.creator})`,
      })
      .from(aptos_schemas);
    return result[0].count as number;
  }

  async getAttestorCount() {
    const result = await db
      .select({
        count: sql`COUNT(DISTINCT ${aptos_attestations.attestor})`,
      })
      .from(aptos_attestations);
    return result[0].count as number;
  }

  async getAttestationCount() {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(aptos_attestations);
    return result[0].count as number;
  }

  async downloadOffChainData(account: string, blobName: string) {
    let data: Uint8Array;
    try {
      const { downloadFromShelby } = await loadMoveraSdk();
      data = await downloadFromShelby({
        account,
        blobName,
        apiKey: process.env.SHELBY_API_KEY,
        network: SHELBY_NETWORK,
      });
    } catch (error) {
      const apiKey = process.env.SHELBY_API_KEY;
      const baseUrl = process.env.SHELBY_RPC_URL ?? 'https://api.shelbynet.shelby.xyz/shelby';
      const encodedBlobName = blobName
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
      const url = `${baseUrl}/v1/blobs/${account}/${encodedBlobName}`;
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Shelby download failed: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      data = new Uint8Array(buffer);
    }
    const { computeBlake2b256 } = await loadMoveraSdk();
    const hash = computeBlake2b256(data);
    return {
      data_base64: Buffer.from(data).toString('base64'),
      data_hash: `0x${Buffer.from(hash).toString('hex')}`,
    };
  }

  async uploadOffChainData(schemaName: string, dataBase64: string) {
    const privateKeyHex = process.env.SHELBY_UPLOADER_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('SHELBY_UPLOADER_PRIVATE_KEY is not set');
    }

    const privateKeyBytes = Hex.fromHexString(privateKeyHex).toUint8Array();
    const privateKey = new Ed25519PrivateKey(privateKeyBytes);
    const account = Account.fromPrivateKey({ privateKey });

    const data = Buffer.from(dataBase64, 'base64');
    const { computeBlake2b256, uploadToShelby } = await loadMoveraSdk();
    const dataHash = computeBlake2b256(new Uint8Array(data));
    const dataHashHex = Buffer.from(dataHash).toString('hex');

    const slug = schemaName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'schema';
    const blobName = `movera/${slug}/${dataHashHex}`;

    const upload = await uploadToShelby({
      account,
      blobName,
      blobData: new Uint8Array(data),
      apiKey: process.env.SHELBY_API_KEY,
      network: SHELBY_NETWORK,
    });

    const normalizeHex = (value: string) =>
      value.startsWith('0x') ? value : `0x${value}`;

    return {
      account: upload.account,
      blob_name: upload.blobName,
      data_hash: normalizeHex(Buffer.from(upload.dataHash).toString('hex')),
      blob_merkle_root: normalizeHex(upload.blobMerkleRoot),
      register_tx_hash: normalizeHex(upload.registerTxHash),
    };
  }

  async getSchemaCount() {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(aptos_schemas);
    return result[0].count as number;
  }

  async getAttestationCntBySchema(schema: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(aptos_attestations)
      .where(eq(aptos_attestations.schema, schema));
    return result[0].count as number;
  }

  async getAttestationCntByUser(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(aptos_attestations)
      .where(
        or(
          eq(aptos_attestations.attestor, address),
          eq(aptos_attestations.recipient, address),
        ),
      );
    return result[0].count as number;
  }

  async getAttestationCntByCreator(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(aptos_attestations)
      .where(eq(aptos_attestations.attestor, address));
    return result[0].count as number;
  }

  async getAttestationCntByRecipient(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(aptos_attestations)
      .where(eq(aptos_attestations.recipient, address));
    return result[0].count as number;
  }

  // ========================================
  // GraphQL-based functions
  // These functions fetch data from GraphQL API instead of direct database access
  // ========================================

  // Schema related GraphQL functions
  async getSchemaCountFromGraphQL() {
    return await this.graphqlService.getSchemaCount();
  }

  async getSchemasFromGraphQL(offset: number, limit: number): Promise<Schema[]> {
    // Get schemas first
    const schemas = await this.graphqlService.getSchemas(offset, limit);
    
    // Get attestation count for each schema
    const schemasWithCount = await Promise.all(
      schemas.map(async (schema) => {
        const attestationCount = await this.graphqlService.getAttestationCountBySchema(schema.address);
        return {
          ...schema,
          attestation_cnt: attestationCount,
        };
      })
    );
    
    return schemasWithCount;
  }

  async findSchemaByAddressFromGraphQL(address: string): Promise<Schema | null> {
    const schema = await this.graphqlService.findSchemaByAddress(address);
    if (!schema) {
      return null;
    }
    
    // Get attestation count for this schema
    const attestationCount = await this.graphqlService.getAttestationCountBySchema(schema.address);
    return {
      ...schema,
      attestation_cnt: attestationCount,
    };
  }

  async searchSchemaFromGraphQL(searchInput: string): Promise<Schema[]> {
    const schemas = await this.graphqlService.searchSchema(searchInput);
    
    // Get attestation count for each schema
    const schemasWithCount = await Promise.all(
      schemas.map(async (schema) => {
        const attestationCount = await this.graphqlService.getAttestationCountBySchema(schema.address);
        return {
          ...schema,
          attestation_cnt: attestationCount,
        };
      })
    );
    
    return schemasWithCount;
  }

  async getSchemaCreatorCntFromGraphQL() {
    return await this.graphqlService.getSchemaCreatorCnt();
  }

  // Attestation related GraphQL functions
  async attestationCountFromGraphQL() {
    return await this.graphqlService.getAttestationCount();
  }

  async revokedCountFromGraphQL() {
    return await this.graphqlService.getRevokedCount();
  }

  async getAttestationsFromGraphQL(offset: number, limit: number): Promise<Attestation[]> {
    return await this.graphqlService.getAttestations(offset, limit);
  }

  async getAttestationsWithSchemasFromGraphQL(offset: number, limit: number): Promise<AttestationWithSchema[]> {
    return await this.graphqlService.getAttestationsWithSchemas(offset, limit);
  }

  async getAttestationsBySchemaFromGraphQL(schema: string, offset: number, limit: number): Promise<AttestationWithSchema[]> {
    return await this.graphqlService.getAttestationsBySchema(schema, offset, limit);
  }

  async getAttestationsByUserFromGraphQL(address: string, offset: number, limit: number): Promise<AttestationWithSchema[]> {
    return await this.graphqlService.getAttestationsByUser(address, offset, limit);
  }

  async findAttestationByAddressFromGraphQL(address: string): Promise<Attestation | null> {
    return await this.graphqlService.findAttestationByAddress(address);
  }

  async getAttestationAndSchemaFromGraphQL(attestationAddress: string): Promise<AttestationWithSchema | null> {
    return await this.graphqlService.getAttestationAndSchema(attestationAddress);
  }

  async getAttestorCountFromGraphQL() {
    return await this.graphqlService.getAttestorCount();
  }

  async getAttestationCountFromGraphQL() {
    return await this.graphqlService.getAttestationCount();
  }

  async getAttestationCntBySchemaFromGraphQL(schema: string) {
    return await this.graphqlService.getAttestationCntBySchema(schema);
  }

  async getAttestationCntByUserFromGraphQL(address: string) {
    return await this.graphqlService.getAttestationCntByUser(address);
  }

  async getAttestationCntByCreatorFromGraphQL(address: string) {
    return await this.graphqlService.getAttestationCntByCreator(address);
  }

  async getAttestationCntByRecipientFromGraphQL(address: string) {
    return await this.graphqlService.getAttestationCntByRecipient(address);
  }

  // ========================================
  // Enhanced methods with pagination support
  // These methods return both data and total count for pagination
  // ========================================

  async getSchemasWithPagination(offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getSchemas(offset, limit),
      this.getSchemaCount(),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }

  async getAttestationsWithPagination(offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getAttestationsWithSchemas(offset, limit),
      this.getAttestationCount(),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }

  async getAttestationsBySchemaWithPagination(schema: string, offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getAttestationsBySchema(schema, offset, limit),
      this.getAttestationCntBySchema(schema),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }

  async getAttestationsByUserWithPagination(address: string, offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getAttestationsByUser(address, offset, limit),
      this.getAttestationCntByUser(address),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }

  // GraphQL versions with pagination
  async getSchemasWithPaginationFromGraphQL(offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getSchemasFromGraphQL(offset, limit),
      this.getSchemaCountFromGraphQL(),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }

  async getAttestationsWithPaginationFromGraphQL(offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getAttestationsWithSchemasFromGraphQL(offset, limit),
      this.getAttestationCountFromGraphQL(),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }

  async getAttestationsBySchemaWithPaginationFromGraphQL(schema: string, offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getAttestationsBySchemaFromGraphQL(schema, offset, limit),
      this.getAttestationCntBySchemaFromGraphQL(schema),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }

  async getAttestationsByUserWithPaginationFromGraphQL(address: string, offset: number, limit: number) {
    const [items, totalCount] = await Promise.all([
      this.getAttestationsByUserFromGraphQL(address, offset, limit),
      this.getAttestationCntByUserFromGraphQL(address),
    ]);

    return {
      items,
      total: totalCount,
      offset,
      limit,
    };
  }
}
