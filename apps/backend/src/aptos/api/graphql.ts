import { GraphQLClient, gql } from 'graphql-request';

// Types for GraphQL responses
export interface Schema {
  id: number;
  address: string;
  name: string;
  schema: string;
  revokable: boolean;
  resolver: string;
  creator: string;
  created_at: string;
  tx_hash: string;
  attestation_cnt?: number;
}

export interface Attestation {
  id: number;
  address: string;
  schema: string;
  ref_attestation: string;
  time: string;
  expiration_time: string;
  revocation_time: string;
  revokable: boolean;
  attestor: string;
  recipient: string;
  data: string;
  tx_hash: string;
}

export interface AttestationWithSchema extends Attestation {
  address: string; // Attestation address
  schema: string; // Schema address
  time: string; // Attestation time
  attestor: string; // Attestor address
  recipient: string; // Recipient address
  schema_name: string;
  schema_address: string;
  schema_data?: string;
}

interface CountResult {
  count: number;
}

export class GraphQLService {
  private client: GraphQLClient;
  private url: string;

  constructor(url: string, adminSecret?: string) {
    this.url = url;
    const headers: Record<string, string> = {};
    
    if (adminSecret) {
      headers['Content-Type'] = 'application/json';
      headers['x-hasura-admin-secret'] = adminSecret;
      console.log('GraphQL Service initialized with admin secret authentication');
    } else {
      console.warn('GraphQL Service initialized without authentication - ensure Hasura allows public access');
    }

    this.client = new GraphQLClient(url, {
      headers
    });
  }

  private async executeQuery<T>(query: string, variables?: any): Promise<T> {
    try {
      return await this.client.request<T>(query, variables);
    } catch (error) {
      console.error('GraphQL query failed:', {
        url: this.url,
        error: error.message,
        query: query.substring(0, 100) + '...'
      });
      throw error;
    }
  }

  // Schema related queries
  async getSchemaCount(): Promise<number> {
    const query = gql`
      query GetSchemaCount {
        schemas_aggregate {
          aggregate {
            count
          }
        }
      }
    `;
    const result = await this.executeQuery<{ schemas_aggregate: { aggregate: CountResult } }>(query);
    return result.schemas_aggregate.aggregate.count;
  }

  async getSchemas(offset: number, limit: number): Promise<Schema[]> {
    const query = gql`
      query GetSchemas($offset: Int!, $limit: Int!) {
        schemas(offset: $offset, limit: $limit, order_by: {created_at: desc}) {
          url
          tx_hash
          schema
          revokable
          resolver
          name
          description
          creator
          created_at
          address
        }
      }
    `;
    const variables = { offset, limit };
    const result = await this.executeQuery<{ schemas: Schema[] }>(query, variables);
    return result.schemas;
  }

  async findSchemaByAddress(address: string): Promise<Schema | null> {
    const query = gql`
      query FindSchemaByAddress($address: String!) {
        schemas(where: {address: {_eq: $address}}) {
          address
          created_at
          creator
          description
          resolver
          name
          revokable
          schema
          tx_hash
          url
        }
      }
    `;
    const variables = { address };
    const result = await this.executeQuery<{ schemas: Schema[] }>(query, variables);
    return result.schemas[0];
  }

  async searchSchema(searchInput: string): Promise<Schema[]> {
    const query = gql`
      query SearchSchema($searchInput: String!) {
        schemas(where: {_or: [{name: {_eq: $searchInput}}, {address: {_eq: $searchInput}}]}) {
          address
          name
          schema
          revokable
          resolver
          creator
          created_at
          tx_hash
        }
      }
    `;
    const variables = { searchInput };
    const result = await this.executeQuery<{ schemas: Schema[] }>(query, variables);
    return result.schemas;
  }

  async getSchemaCreatorCnt(): Promise<number> {
    const query = gql`
      query GetSchemaCreatorCount {
        schemas_aggregate {
          aggregate {
            count(distinct: true, columns: creator)
          }
        }
      }
    `;
    const result = await this.executeQuery<{ schemas_aggregate: { aggregate: CountResult } }>(query);
    return result.schemas_aggregate.aggregate.count;
  }

  async getAttestationCountBySchema(schema: string): Promise<number> {
    const query = gql`
      query GetAttestationCountBySchema($schema: String!) {
        attestations_aggregate(where: {schema: {_eq: $schema}}) {
          aggregate {
            count
          }
        }
      }
    `;
    const variables = { schema };
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query, variables);
    return result.attestations_aggregate.aggregate.count;
  }

  // Attestation related queries
  async getAttestationCount(): Promise<number> {
    const query = gql`
      query GetAttestationCount {
        attestations_aggregate {
          aggregate {
            count
          }
        }
      }
    `;
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query);
    return result.attestations_aggregate.aggregate.count;
  }

  async getRevokedCount(): Promise<number> {
    const query = gql`
      query GetRevokedCount {
        attestations_aggregate(where: {revocation_time: {_is_null: false}}) {
          aggregate {
            count
          }
        }
      }
    `;
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query);
    return result.attestations_aggregate.aggregate.count;
  }

  async getAttestations(offset: number, limit: number): Promise<Attestation[]> {
    const query = gql`
      query GetAttestations($offset: Int!, $limit: Int!) {
        attestations(offset: $offset, limit: $limit) {
          ref_attestation
          address
          attestor
          data
          expiration_time
          recipient
          revocation_time
          revokable
          schema
          time
          tx_hash
        }
      }
    `;
    const variables = { offset, limit };
    const result = await this.executeQuery<{ attestations: Attestation[] }>(query, variables);
    return result.attestations;
  }

  async getPassportAttestations(recipient: string): Promise<Attestation[]> {
    const protocol_account = '0xa0c1c581f74104add8bcccf999216b83641cf7f63a67ccd13ea4736c0993abeb';
    
    const query = gql`
      query GetPassportAttestations($recipient: String!, $protocol_account: String!) {
        attestations(limit: 1, order_by: {time: desc}, where: {recipient: {_eq: $recipient}, attestor: {_eq: $protocol_account}}) {
          ref_attestation
          address
          attestor
          data
          expiration_time
          recipient
          revocation_time
          revokable
          schema
          time
          tx_hash
        }
      }
    `;
    const variables = { recipient, protocol_account };
    const result = await this.executeQuery<{ attestations: Attestation[] }>(query, variables);
    return result.attestations;
  }

  async getAttestationsWithSchemas(offset: number, limit: number): Promise<AttestationWithSchema[]> {
    // First, get attestations
    const attestationsQuery = gql`
      query GetAttestations($offset: Int!, $limit: Int!) {
        attestations(offset: $offset, limit: $limit, order_by: {time: desc}) {
          ref_attestation
          address
          attestor
          expiration_time
          recipient
          revocation_time
          revokable
          schema
          time
          tx_hash
        }
      }
    `;
    
    const attestationsResult = await this.executeQuery<{ attestations: Attestation[] }>(attestationsQuery, { offset, limit });
    const attestations = attestationsResult.attestations;
    
    if (attestations.length === 0) {
      return [];
    }
    
    // Get unique schema addresses from attestations
    const schemaAddresses = [...new Set(attestations.map(a => a.schema))];
    
    // Query schemas for these addresses
    const schemasQuery = gql`
      query GetSchemasByAddresses($addresses: [String!]!) {
        schemas(where: {address: {_in: $addresses}}) {
          address
          name
        }
      }
    `;
    
    const schemasResult = await this.executeQuery<{ schemas: Schema[] }>(schemasQuery, { addresses: schemaAddresses });
    const schemas = schemasResult.schemas;
    
    // Create a map for quick schema lookup
    const schemaMap = new Map(schemas.map(s => [s.address, s]));
    
    // Combine attestations with their corresponding schemas
    const attestationsWithSchemas: AttestationWithSchema[] = attestations.map(attestation => {
      const schema = schemaMap.get(attestation.schema);
      return {
        ...attestation,
        schema_name: schema?.name || '',
        schema_address: schema?.address || attestation.schema,
      };
    });
    
    return attestationsWithSchemas;
  }

  async getAttestationsBySchema(schema: string, offset: number, limit: number): Promise<AttestationWithSchema[]> {
    // First, get attestations for the specific schema
    const attestationsQuery = gql`
      query GetAttestationsBySchema($schema: String!, $offset: Int!, $limit: Int!) {
        attestations(where: {schema: {_eq: $schema}}, offset: $offset, limit: $limit) {
          ref_attestation
          address
          attestor
          expiration_time
          recipient
          revocation_time
          revokable
          schema
          time
          tx_hash
        }
      }
    `;
    
    const attestationsResult = await this.executeQuery<{ attestations: Attestation[] }>(attestationsQuery, { schema, offset, limit });
    const attestations = attestationsResult.attestations;
    
    if (attestations.length === 0) {
      return [];
    }
    
    // Get the schema information
    const schemaQuery = gql`
      query GetSchemaByAddress($address: String!) {
        schemas(where: {address: {_eq: $address}}) {
          address
          name
        }
      }
    `;
    
    const schemaResult = await this.executeQuery<{ schemas: Schema[] }>(schemaQuery, { address: schema });
    const schemaInfo = schemaResult.schemas[0];
    
    // Combine attestations with schema information
    const attestationsWithSchemas: AttestationWithSchema[] = attestations.map(attestation => ({
      ...attestation,
      schema_name: schemaInfo?.name || '',
      schema_address: schemaInfo?.address || schema,
    }));
    
    return attestationsWithSchemas;
  }

  async getAttestationsByUser(address: string, offset: number, limit: number): Promise<AttestationWithSchema[]> {
    // First, get attestations for the user (as attestor or recipient)
    const attestationsQuery = gql`
      query GetAttestationsByUser($address: String!, $offset: Int!, $limit: Int!) {
        attestations(where: {_or: [{attestor: {_eq: $address}}, {recipient: {_eq: $address}}]}, offset: $offset, limit: $limit) {
          ref_attestation
          address
          attestor
          expiration_time
          recipient
          revocation_time
          revokable
          schema
          time
          tx_hash
        }
      }
    `;
    
    const attestationsResult = await this.executeQuery<{ attestations: Attestation[] }>(attestationsQuery, { address, offset, limit });
    const attestations = attestationsResult.attestations;
    
    if (attestations.length === 0) {
      return [];
    }
    
    // Get unique schema addresses from attestations
    const schemaAddresses = [...new Set(attestations.map(a => a.schema))];
    
    // Query schemas for these addresses
    const schemasQuery = gql`
      query GetSchemasByAddresses($addresses: [String!]!) {
        schemas(where: {address: {_in: $addresses}}) {
          address
          name
        }
      }
    `;
    
    const schemasResult = await this.executeQuery<{ schemas: Schema[] }>(schemasQuery, { addresses: schemaAddresses });
    const schemas = schemasResult.schemas;
    
    // Create a map for quick schema lookup
    const schemaMap = new Map(schemas.map(s => [s.address, s]));
    
    // Combine attestations with their corresponding schemas
    const attestationsWithSchemas: AttestationWithSchema[] = attestations.map(attestation => {
      const schema = schemaMap.get(attestation.schema);
      return {
        ...attestation,
        schema_name: schema?.name || '',
        schema_address: schema?.address || attestation.schema,
      };
    });
    
    return attestationsWithSchemas;
  }

  async findAttestationByAddress(address: string): Promise<Attestation | null> {
    const query = gql`
      query FindAttestationByAddress($address: String!) {
        attestation(address: $address) {
          address
          schema
          ref_attestation
          time
          expiration_time
          revocation_time
          attestor
          recipient
          data
          tx_hash
        }
      }
    `;
    const variables = { address };
    const result = await this.executeQuery<{ attestation: Attestation | null }>(query, variables);
    return result.attestation;
  }

  async getAttestationAndSchema(attestationAddress: string): Promise<AttestationWithSchema | null> {
    // First, get the attestation
    const attestationQuery = gql`
      query GetAttestationByAddress($address: String!) {
        attestations(where: {address: {_eq: $address}}) {
          ref_attestation
          address
          attestor
          expiration_time
          recipient
          revocation_time
          revokable
          schema
          time
          data
          tx_hash
        }
      }
    `;
    
    const attestationResult = await this.executeQuery<{ attestations: Attestation[] }>(attestationQuery, { address: attestationAddress });
    const attestations = attestationResult.attestations;
    
    if (attestations.length === 0) {
      return null;
    }
    
    const attestation = attestations[0];
    
    // Get the schema information
    const schemaQuery = gql`
      query GetSchemaByAddress($address: String!) {
        schemas(where: {address: {_eq: $address}}) {
          address
          name
          schema
        }
      }
    `;
    
    const schemaResult = await this.executeQuery<{ schemas: Schema[] }>(schemaQuery, { address: attestation.schema });
    const schemaInfo = schemaResult.schemas[0];
    
    // Combine attestation with schema information
    const attestationWithSchema: AttestationWithSchema = {
      ...attestation,
      schema_name: schemaInfo?.name || '',
      schema_address: schemaInfo?.address || attestation.schema,
      schema_data: schemaInfo?.schema || attestation.schema,
    };
    
    return attestationWithSchema;
  }

  async getAttestorCount(): Promise<number> {
    const query = gql`
      query GetAttestorCount {
        attestations_aggregate {
          aggregate {
            count(distinct: true, columns: attestor)
          }
        }
      }
    `;
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query);
    return result.attestations_aggregate.aggregate.count;
  }

  async getAttestationCntBySchema(schema: string): Promise<number> {
    const query = gql`
      query GetAttestationCntBySchema($schema: String!) {
        attestations_aggregate(where: {schema: {_eq: $schema}}) {
          aggregate {
            count
          }
        }
      }
    `;
    const variables = { schema };
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query, variables);
    return result.attestations_aggregate.aggregate.count;
  }

  async getAttestationCntByUser(address: string): Promise<number> {
    const query = gql`
      query GetAttestationCntByUser($address: String!) {
        attestations_aggregate(where: {_or: [{attestor: {_eq: $address}}, {recipient: {_eq: $address}}]}) {
          aggregate {
            count
          }
        }
      }
    `;
    const variables = { address };
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query, variables);
    return result.attestations_aggregate.aggregate.count;
  }

  async getAttestationCntByCreator(address: string): Promise<number> {
    const query = gql`
      query GetAttestationCntByCreator($address: String!) {
        attestations_aggregate(where: {attestor: {_eq: $address}}) {
          aggregate {
            count
          }
        }
      }
    `;
    const variables = { address };
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query, variables);
    return result.attestations_aggregate.aggregate.count;
  }

  async getAttestationCntByRecipient(address: string): Promise<number> {
    const query = gql`
      query GetAttestationCntByRecipient($address: String!) {
        attestations_aggregate(where: {recipient: {_eq: $address}}) {
          aggregate {
            count
          }
        }
      }
    `;
    const variables = { address };
    const result = await this.executeQuery<{ attestations_aggregate: { aggregate: CountResult } }>(query, variables);
    return result.attestations_aggregate.aggregate.count;
  }
}