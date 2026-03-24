import { Injectable, OnModuleInit } from '@nestjs/common';
import { SuiClient, getFullnodeUrl, EventId } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { bcs } from '@mysten/bcs';
import { db } from '../db/db';
import { sql, eq, desc, or } from 'drizzle-orm';
import { sui_schemas, sui_attestations } from 'src/db/schema';
import { fromHEX } from '@mysten/bcs';

type NewSuiSchema = typeof sui_schemas.$inferInsert;
type NewSuiAttestation = typeof sui_attestations.$inferInsert;

const PACKAGE_ID = process.env.SUI_PACKAGE_ID;
const SUI_NETWORK = process.env.SUI_NETWORK || 'testnet';

async function loadMoveraSdk() {
  return import('@movera/sdk');
}

@Injectable()
export class SuiService implements OnModuleInit {
  private suiClient: SuiClient;

  constructor() {
    if (!PACKAGE_ID) {
      throw new Error('SUI_PACKAGE_ID environment variable is required but not set');
    }

    this.suiClient = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK as any) });
  }

  onModuleInit() {
    this.startListening();
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async startListening() {
    console.log('start listening sui');
    console.log(`Using SUI_PACKAGE_ID: ${PACKAGE_ID}`);

    while (true) {
      try {
        await Promise.all([
          this.schemaCreatedEvents(),
          this.attestationCreatedEvents(),
        ]);
      } catch (error) {
        console.error('Error fetching events', error);
      }
      await this.sleep(1000);
    }
  }

  private async schemaCreatedEvents() {
    let nextPage = true;
    let cursor: EventId | undefined;
    const queryOptions: any = {
      query: {
        MoveEventType: `${PACKAGE_ID}::schema::SchemaCreated`,
      },
      limit: 100,
    };

    while (nextPage) {
      if (cursor) {
        queryOptions.cursor = cursor;
      }
      const { data, hasNextPage, nextCursor } =
        await this.suiClient.queryEvents(queryOptions);

      cursor = nextCursor;
      nextPage = hasNextPage;

      for (const event of data) {
        const parsedJson = event.parsedJson as any;
        const schemaDataString = bcs
          .string()
          .parse(new Uint8Array(parsedJson.schema))
          .toString();
        const schema = {
          address: parsedJson.schema_address,
          name: parsedJson.name,
          description: parsedJson.description,
          url: parsedJson.url,
          creator: parsedJson.creator,
          created_at: parsedJson.created_at,
          schema: schemaDataString,
          revokable: parsedJson.revokable,
          resolver: parsedJson.event_type == 1 ? true : false,
          admin_cap: parsedJson.admin_cap || '0x0',
          tx_hash: event.id.txDigest,
        };

        if (await this.findSchemaByAddress(schema.address)) {
          continue;
        }
        await this.createSchema(schema);
      }
    }
  }

  private async attestationCreatedEvents() {
    let nextPage = true;
    let cursor: EventId | undefined;
    while (nextPage) {
      const { data, hasNextPage, nextCursor } =
        await this.suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::attestation::AttestationCreated`,
          },
          cursor: cursor,
          limit: 100,
        });

      cursor = nextCursor;
      nextPage = hasNextPage;

      for (const event of data) {
        const parsedJson = event.parsedJson as any;

        // Determine storage type (default to ON_CHAIN for backward compatibility)
        const storageType = parsedJson.storage_type !== undefined
          ? parsedJson.storage_type
          : 0; // Default to ON_CHAIN for old events

        // Parse data based on storage type
        let attestationDataString: string | null = null;
        if (storageType === 0) {
          // ON_CHAIN: Parse data field
          try {
            attestationDataString = bcs
              .string()
              .parse(new Uint8Array(parsedJson.data))
              .toString();
          } catch (error) {
            console.error('Error parsing attestation data:', error);
            attestationDataString = null;
          }
        } else {
          // OFF_CHAIN: Data is stored off-chain, field is empty
          attestationDataString = null;
        }

        // Parse off-chain storage fields
        let walrusSuiObjectId: string | null = null;
        let walrusBlobId: string | null = null;
        let dataHash: string | null = null;
        let encrypted: boolean = false;
        let sealNonce: string | null = null;
        let sealPolicyId: string | null = null;

        if (storageType === 1) {
          // OFF_CHAIN storage
          walrusSuiObjectId = parsedJson.walrus_sui_object_id || null;

          // Parse walrus_blob_id (vector<u8> as bytes, convert to string)
          if (parsedJson.walrus_blob_id) {
            if (Array.isArray(parsedJson.walrus_blob_id)) {
              // Convert bytes to string (base64url)
              walrusBlobId = new TextDecoder().decode(new Uint8Array(parsedJson.walrus_blob_id));
            } else if (typeof parsedJson.walrus_blob_id === 'string') {
              walrusBlobId = parsedJson.walrus_blob_id;
            }
          }

          // Parse data_hash (vector<u8>)
          if (parsedJson.data_hash && Array.isArray(parsedJson.data_hash)) {
            dataHash = Buffer.from(parsedJson.data_hash).toString('hex');
          } else if (parsedJson.data_hash) {
            dataHash = parsedJson.data_hash;
          }

          encrypted = parsedJson.encrypted === true;

          // Parse seal_nonce (Option<vector<u8>>)
          if (parsedJson.seal_nonce) {
            if (typeof parsedJson.seal_nonce === 'object' && parsedJson.seal_nonce.fields) {
              // Option::some case
              const nonceValue = parsedJson.seal_nonce.fields.value || parsedJson.seal_nonce.fields;
              if (Array.isArray(nonceValue)) {
                // Convert bytes to hex string for storage
                sealNonce = Buffer.from(nonceValue).toString('hex');
              }
            } else if (Array.isArray(parsedJson.seal_nonce)) {
              sealNonce = Buffer.from(parsedJson.seal_nonce).toString('hex');
            }
          }

          // Parse seal_policy_id (Option<address>)
          if (parsedJson.seal_policy_id) {
            if (typeof parsedJson.seal_policy_id === 'object' && parsedJson.seal_policy_id.fields) {
              // Option::some case
              sealPolicyId = parsedJson.seal_policy_id.fields.value || parsedJson.seal_policy_id.fields.id || null;
            } else if (typeof parsedJson.seal_policy_id === 'string') {
              sealPolicyId = parsedJson.seal_policy_id;
            }
          }
        }

        const attestation = {
          address: parsedJson.id,
          schema: parsedJson.schema,
          ref_attestation: parsedJson.ref_attestation,
          time: parsedJson.time,
          expiration_time: parsedJson.expiration_time,
          revocation_time: '0',
          revokable: parsedJson.revokable,
          attestor: parsedJson.attestor,
          recipient: parsedJson.recipient,
          storage_type: storageType,
          data: attestationDataString,
          walrus_sui_object_id: walrusSuiObjectId,
          walrus_blob_id: walrusBlobId,
          data_hash: dataHash,
          encrypted: encrypted,
          seal_nonce: sealNonce,
          seal_policy_id: sealPolicyId,
          name: parsedJson.name,
          description: parsedJson.description,
          url: parsedJson.url,
          tx_hash: event.id.txDigest,
        };

        if (await this.findAttestationByAddress(attestation.address)) {
          continue;
        }
        await this.createAttestation(attestation);
      }
    }
  }

  async createAttestation(attestation: NewSuiAttestation) {
    await db.insert(sui_attestations).values(attestation);
  }

  async findAttestationByAddress(address: string) {
    return await db.query.sui_attestations.findFirst({
      where: eq(sui_attestations.address, address),
    });
  }

  async attestationCount() {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sui_attestations);
    return result[0].count as number;
  }

  async getAttestations(offset: number, limit: number) {
    return await db
      .select()
      .from(sui_attestations)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`CAST(${sui_attestations.time} AS BIGINT) DESC`);
  }

  async getAttestationsWithSchemas(offset: number, limit: number) {
    return await db
      .select({
        // attestation fields
        id: sui_attestations.id,
        address: sui_attestations.address,
        schema: sui_schemas.schema,
        ref_attestation: sui_attestations.ref_attestation,
        time: sui_attestations.time,
        expiration_time: sui_attestations.expiration_time,
        revocation_time: sui_attestations.revocation_time,
        revokable: sui_attestations.revokable,
        attestor: sui_attestations.attestor,
        recipient: sui_attestations.recipient,
        storage_type: sui_attestations.storage_type,
        data: sui_attestations.data,
        walrus_sui_object_id: sui_attestations.walrus_sui_object_id,
        walrus_blob_id: sui_attestations.walrus_blob_id,
        data_hash: sui_attestations.data_hash,
        encrypted: sui_attestations.encrypted,
        seal_nonce: sui_attestations.seal_nonce,
        seal_policy_id: sui_attestations.seal_policy_id,
        name: sui_attestations.name,
        description: sui_attestations.description,
        url: sui_attestations.url,
        tx_hash: sui_attestations.tx_hash,
        // schema fields
        schema_id: sui_schemas.id,
        schema_name: sui_schemas.name,
        schema_address: sui_schemas.address,
        schema_data: sui_schemas.schema,
      })
      .from(sui_attestations)
      .leftJoin(sui_schemas, eq(sui_schemas.address, sui_attestations.schema))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`CAST(${sui_attestations.time} AS BIGINT) DESC`);
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

  async getAttestationsBySchema(schema: string, offset: number, limit: number) {
    return await db
      .select({
        // attestation fields
        id: sui_attestations.id,
        address: sui_attestations.address,
        schema: sui_schemas.schema,
        ref_attestation: sui_attestations.ref_attestation,
        time: sui_attestations.time,
        expiration_time: sui_attestations.expiration_time,
        revocation_time: sui_attestations.revocation_time,
        revokable: sui_attestations.revokable,
        attestor: sui_attestations.attestor,
        recipient: sui_attestations.recipient,
        storage_type: sui_attestations.storage_type,
        data: sui_attestations.data,
        walrus_sui_object_id: sui_attestations.walrus_sui_object_id,
        walrus_blob_id: sui_attestations.walrus_blob_id,
        data_hash: sui_attestations.data_hash,
        encrypted: sui_attestations.encrypted,
        seal_nonce: sui_attestations.seal_nonce,
        seal_policy_id: sui_attestations.seal_policy_id,
        name: sui_attestations.name,
        description: sui_attestations.description,
        url: sui_attestations.url,
        tx_hash: sui_attestations.tx_hash,
        // schema fields
        schema_id: sui_schemas.id,
        schema_name: sui_schemas.name,
        schema_address: sui_schemas.address,
        schema_data: sui_schemas.schema,
      })
      .from(sui_attestations)
      .leftJoin(sui_schemas, eq(sui_schemas.address, sui_attestations.schema))
      .limit(limit)
      .offset(offset)
      .where(eq(sui_schemas.address, schema))
      .orderBy(sql`CAST(${sui_attestations.time} AS BIGINT) DESC`);
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

  async getAttestationsByUser(address: string, offset: number, limit: number) {
    return await db
      .select({
        // attestation fields
        id: sui_attestations.id,
        address: sui_attestations.address,
        schema: sui_schemas.schema,
        ref_attestation: sui_attestations.ref_attestation,
        time: sui_attestations.time,
        expiration_time: sui_attestations.expiration_time,
        revocation_time: sui_attestations.revocation_time,
        revokable: sui_attestations.revokable,
        attestor: sui_attestations.attestor,
        recipient: sui_attestations.recipient,
        storage_type: sui_attestations.storage_type,
        data: sui_attestations.data,
        walrus_sui_object_id: sui_attestations.walrus_sui_object_id,
        walrus_blob_id: sui_attestations.walrus_blob_id,
        data_hash: sui_attestations.data_hash,
        encrypted: sui_attestations.encrypted,
        seal_nonce: sui_attestations.seal_nonce,
        seal_policy_id: sui_attestations.seal_policy_id,
        name: sui_attestations.name,
        description: sui_attestations.description,
        url: sui_attestations.url,
        tx_hash: sui_attestations.tx_hash,
        // schema fields
        schema_id: sui_schemas.id,
        schema_name: sui_schemas.name,
        schema_address: sui_schemas.address,
        schema_data: sui_schemas.schema,
      })
      .from(sui_attestations)
      .leftJoin(sui_schemas, eq(sui_schemas.address, sui_attestations.schema))
      .limit(limit)
      .offset(offset)
      .where(
        or(
          eq(sui_attestations.attestor, address),
          eq(sui_attestations.recipient, address),
        ),
      )
      .orderBy(sql`CAST(${sui_attestations.time} AS BIGINT) DESC`);
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

  async createSchema(schema: NewSuiSchema) {
    await db.insert(sui_schemas).values(schema);
  }

  async findSchemaByAddress(address: string) {
    const res = await db
      .select({
        id: sui_schemas.id,
        address: sui_schemas.address,
        name: sui_schemas.name,
        schema: sui_schemas.schema,
        creator: sui_schemas.creator,
        revokable: sui_schemas.revokable,
        resolver: sui_schemas.resolver,
        created_at: sui_schemas.created_at,
        tx_hash: sui_schemas.tx_hash,
        attestation_cnt: sql<number>`COUNT(${sui_attestations.id})`,
      })
      .from(sui_schemas)
      .leftJoin(
        sui_attestations,
        eq(sui_attestations.schema, sui_schemas.address),
      )
      .where(eq(sui_schemas.address, address))
      .groupBy(
        sui_schemas.id,
        sui_schemas.address,
        sui_schemas.name,
        sui_schemas.schema,
        sui_schemas.creator,
        sui_schemas.revokable,
        sui_schemas.resolver,
        sui_schemas.created_at,
        sui_schemas.tx_hash,
      );
    return res[0];
  }

  async searchSchema(searchInput: string) {
    const res = await db
      .select()
      .from(sui_schemas)
      .where(
        or(
          eq(sql`CAST(${sui_schemas.id} AS TEXT)`, searchInput as string),
          eq(sui_schemas.address, searchInput),
        ),
      );
    return res;
  }

  async getAttestationAndSchema(address: string) {
    const res = await db
      .select({
        // attestation fields
        id: sui_attestations.id,
        address: sui_attestations.address,
        schema: sui_schemas.schema,
        ref_attestation: sui_attestations.ref_attestation,
        time: sui_attestations.time,
        expiration_time: sui_attestations.expiration_time,
        revocation_time: sui_attestations.revocation_time,
        revokable: sui_attestations.revokable,
        attestor: sui_attestations.attestor,
        recipient: sui_attestations.recipient,
        storage_type: sui_attestations.storage_type,
        data: sui_attestations.data,
        walrus_sui_object_id: sui_attestations.walrus_sui_object_id,
        walrus_blob_id: sui_attestations.walrus_blob_id,
        data_hash: sui_attestations.data_hash,
        encrypted: sui_attestations.encrypted,
        seal_nonce: sui_attestations.seal_nonce,
        seal_policy_id: sui_attestations.seal_policy_id,
        name: sui_attestations.name,
        description: sui_attestations.description,
        url: sui_attestations.url,
        tx_hash: sui_attestations.tx_hash,
        // schema fields
        schema_id: sui_schemas.id,
        schema_name: sui_schemas.name,
        schema_address: sui_schemas.address,
        schema_data: sui_schemas.schema,
      })
      .from(sui_attestations)
      .leftJoin(sui_schemas, eq(sui_schemas.address, sui_attestations.schema))
      .where(eq(sui_attestations.address, address));

    // If not found in database, try to fetch from chain as fallback
    if (!res[0]) {
      try {
        const { getAttestation } = await loadMoveraSdk();
        const chainAttestation = await getAttestation(
          address,
          'sui',
          (process.env.SUI_NETWORK as any) || 'testnet'
        );

        // Return chain data in compatible format
        return {
          id: null,
          address: chainAttestation.attestationAddr,
          schema: chainAttestation.schemaAddr,
          ref_attestation: chainAttestation.ref_attestation,
          time: chainAttestation.time.toString(),
          expiration_time: chainAttestation.expiration_time.toString(),
          revocation_time: chainAttestation.revocation_time.toString(),
          revokable: chainAttestation.revokable,
          attestor: chainAttestation.attestor,
          recipient: chainAttestation.recipient,
          storage_type: chainAttestation.storageType,
          data: chainAttestation.data ? Buffer.from(chainAttestation.data).toString('base64') : null,
          walrus_sui_object_id: (chainAttestation as any).walrusSuiObjectId || null,
          walrus_blob_id: (chainAttestation as any).walrusBlobId || null,
          data_hash: chainAttestation.dataHash ? Buffer.from(chainAttestation.dataHash).toString('hex') : null,
          encrypted: chainAttestation.encrypted || false,
          seal_nonce: (chainAttestation as any).sealNonce ? Buffer.from((chainAttestation as any).sealNonce).toString('hex') : null,
          seal_policy_id: (chainAttestation as any).sealPolicyId || null,
          name: chainAttestation.name,
          description: chainAttestation.description,
          url: chainAttestation.url,
          tx_hash: chainAttestation.txHash || '',
          schema_id: null,
          schema_name: null,
          schema_address: chainAttestation.schemaAddr,
          schema_data: chainAttestation.schemaAddr,
        };
      } catch (error) {
        console.error('Error fetching attestation from chain:', error);
        return null;
      }
    }

    return res[0];
  }

  async schemaCount() {
    const result = await db.select({ count: sql`count(*)` }).from(sui_schemas);
    return result[0].count as number;
  }

  async getSchemas(offset: number, limit: number) {
    return await db
      .select({
        id: sui_schemas.id,
        address: sui_schemas.address,
        name: sui_schemas.name,
        schema: sui_schemas.schema,
        revokable: sui_schemas.revokable,
        resolver: sui_schemas.resolver,
        created_at: sui_schemas.created_at,
        creator: sui_schemas.creator,
        tx_hash: sui_schemas.tx_hash,
        attestation_cnt: sql<number>`COUNT(${sui_attestations.id})`,
      })
      .from(sui_schemas)
      .leftJoin(
        sui_attestations,
        eq(sui_attestations.schema, sui_schemas.address),
      )
      .groupBy(
        sui_schemas.id,
        sui_schemas.address,
        sui_schemas.name,
        sui_schemas.schema,
        sui_schemas.revokable,
        sui_schemas.resolver,
        sui_schemas.created_at,
        sui_schemas.creator,
        sui_schemas.tx_hash,
      )
      .limit(limit)
      .offset(offset)
      .orderBy(desc(sui_schemas.id));
  }

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

  async getSchemaCreatorCnt() {
    const result = await db
      .select({
        count: sql`COUNT(DISTINCT ${sui_schemas.creator})`,
      })
      .from(sui_schemas);
    return result[0].count as number;
  }

  async getAttestorCount() {
    const result = await db
      .select({
        count: sql`COUNT(DISTINCT ${sui_attestations.attestor})`,
      })
      .from(sui_attestations);
    return result[0].count as number;
  }

  async getSchemaCount() {
    const result = await db.select({ count: sql`count(*)` }).from(sui_schemas);
    return result[0].count as number;
  }

  async getAttestationCount() {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sui_attestations);
    return result[0].count as number;
  }

  async getAttestationCntBySchema(schema: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sui_attestations)
      .where(eq(sui_attestations.schema, schema));
    return result[0].count as number;
  }

  async getAttestationCntByUser(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sui_attestations)
      .where(
        or(
          eq(sui_attestations.attestor, address),
          eq(sui_attestations.recipient, address),
        ),
      );
    return result[0].count as number;
  }

  async getAttestationCntByCreator(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sui_attestations)
      .where(eq(sui_attestations.attestor, address));
    return result[0].count as number;
  }

  async getAttestationCntByRecipient(address: string) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(sui_attestations)
      .where(eq(sui_attestations.recipient, address));
    return result[0].count as number;
  }

  async uploadOffChainData(dataBase64: string) {
    const secretKey = process.env.WALRUS_UPLOADER_SECRET_KEY;
    if (!secretKey) {
      throw new Error('WALRUS_UPLOADER_SECRET_KEY is not set');
    }

    const walrusKeypair = Ed25519Keypair.fromSecretKey(fromHEX(secretKey));
    const walrusOwner = process.env.WALRUS_OWNER_ADDRESS || walrusKeypair.toSuiAddress();

    const { WalrusClient } = await loadMoveraSdk();
    const walrusClient = new WalrusClient(this.suiClient as any, {
      network: SUI_NETWORK as any,
      uploadRelay: SUI_NETWORK === 'testnet' ? {
        host: 'https://upload-relay.testnet.walrus.space',
        sendTip: {
          max: 1_000,
        },
      } : undefined,
      storageNodeClientOptions: {
        timeout: 60_000,
      },
    });

    const data = new Uint8Array(Buffer.from(dataBase64, 'base64'));
    const uploadResult = await walrusClient.uploadData(
      data,
      walrusKeypair,
      3,
      false,
      walrusOwner,
    );

    return {
      walrus_sui_object_id: uploadResult.suiObjectId,
      walrus_blob_id: uploadResult.blobId,
    };
  }
}
