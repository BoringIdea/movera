import { Injectable, OnModuleInit } from '@nestjs/common';
import { Aptos, AptosConfig, ClientConfig, Network } from '@aptos-labs/ts-sdk';
import { db } from '../db/db';
import { aptos_schemas, aptos_attestations } from '../db/schema';
import { sql, eq, desc, or, like } from 'drizzle-orm';
import { GraphQLService, Schema, Attestation, AttestationWithSchema } from './api/graphql';
import { PaginatedData } from '../common';

type NewAptosSchema = typeof aptos_schemas.$inferInsert;
type NewAptosAttestation = typeof aptos_attestations.$inferInsert;

const APTOS_ADDRESS = process.env.APTOS_PACKAGE_ADDRESS;

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
    const events = await this.aptosClient.event.getModuleEventsByEventType({
      eventType: `${APTOS_ADDRESS}::attestation::AttestationCreated`,
      options: {
        offset: attestationCnt,
        limit: 100,
      },
    });

    if (events.length > 0) {
      console.log('Attestation created events', events);
      for (const event of events) {
        try {
        const txInfo = await this.aptosClient.getTransactionByVersion({
          ledgerVersion: event.transaction_version,
        });
        const txHash = txInfo.hash;

        const attestation = {
          address: event.data.attestation_address,
          schema: event.data.schema,
          ref_attestation: event.data.ref_attestation,
          time: event.data.time,
          expiration_time: event.data.expiration_time,
          revocation_time: '0',
          attestor: event.data.attestor,
          recipient: event.data.recipient,
          data: event.data.data,
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
    const events = await this.aptosClient.event.getModuleEventsByEventType({
      eventType: `${APTOS_ADDRESS}::attestation::AttestationRevoked`,
      options: {
        offset: revokedCnt,
        limit: 100,
      },
    });

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
    const events = await this.aptosClient.event.getModuleEventsByEventType({
      eventType: `${APTOS_ADDRESS}::schema::SchemaCreated`,
      options: {
        offset: schemaCnt,
        limit: 100,
      },
    });

    if (events.length > 0) {
      console.log('Schema created events', events);
      for (const event of events) {
        try {
        const txInfo = await this.aptosClient.getTransactionByVersion({
          ledgerVersion: event.transaction_version,
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
        data: aptos_attestations.data,
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
