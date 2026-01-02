import { Injectable, OnModuleInit } from '@nestjs/common';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { db } from '../db/db';
import { movement_schemas, movement_attestations } from '../db/schema';
import { sql, eq, desc, or } from 'drizzle-orm';

type NewAptosSchema = typeof movement_schemas.$inferInsert;
type NewAptosAttestation = typeof movement_attestations.$inferInsert;

const MOVEMENT_ADDRESS = process.env.MOVEMENT_ADDRESS;

@Injectable()
export class MovementService implements OnModuleInit {
  private aptosClient: Aptos;

  constructor() {
    this.aptosClient = new Aptos(
      new AptosConfig({
        network: Network.CUSTOM,
        indexer: 'https://indexer.testnet.movementnetwork.xyz',
        fullnode: 'https://testnet.bardock.movementnetwork.xyz/v1',
      }),
    );
  }

  onModuleInit() {
    this.startListening();
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async startListening() {
    console.log('start listening movement aptos');
    while (true) {
      try {
        await Promise.all([
          this.attestationCreatedEvents(),
          this.schemaCreatedEvents(),
        ]);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
      await this.sleep(1000);
    }
  }

  async attestationCreatedEvents() {
    const attestationCnt = await this.attestationCount();
    const events = await this.aptosClient.event.getModuleEventsByEventType({
      eventType: `${MOVEMENT_ADDRESS}::attestation::AttestationCreated`,
      options: {
        offset: attestationCnt,
        limit: 100,
      },
    });

    if (events.length > 0) {
      for (const event of events) {
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
      }
    }
  }

  async attestationRevokedEvents() {
    const revokedCnt = await this.revokedCount();
    const events = await this.aptosClient.event.getModuleEventsByEventType({
      eventType: `${MOVEMENT_ADDRESS}::attestation::AttestationRevoked`,
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
      eventType: `${MOVEMENT_ADDRESS}::schema::SchemaCreated`,
      options: {
        offset: schemaCnt,
        limit: 100,
      },
    });

    if (events.length > 0) {
      for (const event of events) {
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
      }
    }
  }

  async createSchema(data: NewAptosSchema) {
    await db.insert(movement_schemas).values(data);
  }

  async schemaCount() {
    const count = await db
      .select({ count: sql`count(*)` })
      .from(movement_schemas);
    return count[0].count as number;
  }

  async getSchemas(offset: number, limit: number) {
    return await db
      .select({
        id: movement_schemas.id,
        address: movement_schemas.address,
        name: movement_schemas.name,
        schema: movement_schemas.schema,
        revokable: movement_schemas.revokable,
        resolver: movement_schemas.resolver,
        created_at: movement_schemas.created_at,
        attestation_cnt: sql<number>`COUNT(${movement_attestations.id})`,
      })
      .from(movement_schemas)
      .leftJoin(
        movement_attestations,
        eq(movement_attestations.schema, movement_schemas.address),
      )
      .groupBy(
        movement_schemas.id,
        movement_schemas.address,
        movement_schemas.name,
        movement_schemas.schema,
        movement_schemas.revokable,
        movement_schemas.resolver,
        movement_schemas.created_at,
      )
      .limit(limit)
      .offset(offset)
      .orderBy(desc(movement_schemas.created_at));
  }

  async findSchemaByAddress(address: string) {
    const res = await db
      .select({
        id: movement_schemas.id,
        address: movement_schemas.address,
        name: movement_schemas.name,
        schema: movement_schemas.schema,
        revokable: movement_schemas.revokable,
        resolver: movement_schemas.resolver,
        creator: movement_schemas.creator,
        created_at: movement_schemas.created_at,
        tx_hash: movement_schemas.tx_hash,
        attestation_cnt: sql<number>`COUNT(${movement_attestations.id})`,
      })
      .from(movement_schemas)
      .leftJoin(
        movement_attestations,
        eq(movement_attestations.schema, movement_schemas.address),
      )
      .where(eq(movement_schemas.address, address))
      .groupBy(
        movement_schemas.id,
        movement_schemas.address,
        movement_schemas.name,
        movement_schemas.schema,
        movement_schemas.revokable,
        movement_schemas.resolver,
        movement_schemas.creator,
        movement_schemas.created_at,
        movement_schemas.tx_hash,
      );
    return res[0];
  }

  async searchSchema(searchInput: string) {
    const res = await db
      .select()
      .from(movement_schemas)
      .where(
        or(
          eq(sql`CAST(${movement_schemas.id} AS TEXT)`, searchInput),
          eq(movement_schemas.address, searchInput),
        ),
      );
    return res;
  }

  async createAttestation(data: NewAptosAttestation) {
    await db.insert(movement_attestations).values(data);
  }

  async revokeAttestation(address: string, time: string) {
    await db
      .update(movement_attestations)
      .set({ revocation_time: time })
      .where(eq(movement_attestations.address, address));
  }

  async attestationCount() {
    const count = await db
      .select({ count: sql`count(*)` })
      .from(movement_attestations);

    return count[0].count as number;
  }

  async revokedCount() {
    const count = await db
      .select({ count: sql`count(*)` })
      .from(movement_attestations)
      .where(sql`revocation_time != '0'`);

    return count[0].count as number;
  }

  async getAttestations(offset: number, limit: number) {
    const attestations = await db
      .select()
      .from(movement_attestations)
      .offset(offset)
      .limit(limit)
      .orderBy(desc(movement_attestations.time));
    return attestations;
  }

  async getAttestationsWithSchemas(offset: number, limit: number) {
    const attestations = await db
      .select({
        // attestation fields
        id: movement_attestations.id,
        address: movement_attestations.address,
        schema: movement_attestations.schema,
        time: movement_attestations.time,
        attestor: movement_attestations.attestor,
        recipient: movement_attestations.recipient,
        // schema fields
        schema_id: movement_schemas.id,
        schema_name: movement_schemas.name,
        schema_address: movement_schemas.address,
      })
      .from(movement_attestations)
      .leftJoin(
        movement_schemas,
        eq(movement_attestations.schema, movement_schemas.address),
      )
      .offset(offset)
      .limit(limit)
      .orderBy(desc(movement_attestations.time));
    return attestations;
  }

  async getAttestationsBySchema(schema: string, offset: number, limit: number) {
    const attestations = await db
      .select({
        // attestation fields
        id: movement_attestations.id,
        address: movement_attestations.address,
        schema: movement_attestations.schema,
        time: movement_attestations.time,
        attestor: movement_attestations.attestor,
        recipient: movement_attestations.recipient,
        // schema fields
        schema_id: movement_schemas.id,
        schema_name: movement_schemas.name,
        schema_address: movement_schemas.address,
      })
      .from(movement_attestations)
      .leftJoin(
        movement_schemas,
        eq(movement_attestations.schema, movement_schemas.address),
      )
      .offset(offset)
      .limit(limit)
      .where(eq(movement_schemas.address, schema))
      .orderBy(desc(movement_attestations.time));
    return attestations;
  }

  async getAttestationsByUser(address: string, offset: number, limit: number) {
    const attestations = await db
      .select({
        // attestation fields
        id: movement_attestations.id,
        address: movement_attestations.address,
        schema: movement_attestations.schema,
        time: movement_attestations.time,
        attestor: movement_attestations.attestor,
        recipient: movement_attestations.recipient,
        // schema fields
        schema_id: movement_schemas.id,
        schema_name: movement_schemas.name,
        schema_address: movement_schemas.address,
      })
      .from(movement_attestations)
      .leftJoin(
        movement_schemas,
        eq(movement_attestations.schema, movement_schemas.address),
      )
      .offset(offset)
      .limit(limit)
      .where(
        or(
          eq(movement_attestations.attestor, address),
          eq(movement_attestations.recipient, address),
        ),
      )
      .orderBy(desc(movement_attestations.time));
    return attestations;
  }

  async findAttestationByAddress(address: string) {
    const res = await db
      .select()
      .from(movement_attestations)
      .where(eq(movement_attestations.address, address));
    return res[0];
  }

  async getAttestationAndSchema(attestationAddress: string) {
    const res = await db
      .select({
        // attestation fields
        id: movement_attestations.id,
        address: movement_attestations.address,
        schema: movement_attestations.schema,
        ref_attestation: movement_attestations.ref_attestation,
        time: movement_attestations.time,
        expiration_time: movement_attestations.expiration_time,
        revocation_time: movement_attestations.revocation_time,
        attestor: movement_attestations.attestor,
        recipient: movement_attestations.recipient,
        data: movement_attestations.data,
        tx_hash: movement_attestations.tx_hash,
        // schema fields
        schema_id: movement_schemas.id,
        schema_name: movement_schemas.name,
        schema_address: movement_schemas.address,
        schema_data: movement_schemas.schema,
      })
      .from(movement_attestations)
      .leftJoin(
        movement_schemas,
        eq(movement_attestations.schema, movement_schemas.address),
      )
      .where(eq(movement_attestations.address, attestationAddress));

    return res[0];
  }

  async getSchemaCreatorCnt() {
    const result = await db
      .select({
        count: sql`COUNT(DISTINCT ${movement_schemas.creator})`,
      })
      .from(movement_schemas);
    return result[0].count as number;
  }

  async getAttestorCount() {
    const result = await db
      .select({
        count: sql`COUNT(DISTINCT ${movement_attestations.attestor})`,
      })
      .from(movement_attestations);
    return result[0].count as number;
  }

  async getAttestationCount() {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(movement_attestations);
    return result[0].count as number;
  }

  async getSchemaCount() {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(movement_schemas);
    return result[0].count as number;
  }

  async getAttestationCntBySchema(schema: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(movement_attestations)
      .where(eq(movement_attestations.schema, schema));
    return result[0].count as number;
  }

  async getAttestationCntByUser(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(movement_attestations)
      .where(
        or(
          eq(movement_attestations.attestor, address),
          eq(movement_attestations.recipient, address),
        ),
      );
    return result[0].count as number;
  }

  async getAttestationCntByCreator(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(movement_attestations)
      .where(eq(movement_attestations.attestor, address));
    return result[0].count as number;
  }

  async getAttestationCntByRecipient(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(movement_attestations)
      .where(eq(movement_attestations.recipient, address));
    return result[0].count as number;
  }
}
