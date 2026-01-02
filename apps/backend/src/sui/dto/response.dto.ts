import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse, PaginationInfo } from '../../common';

export class SchemaResponseDto {
  @ApiProperty({
    description: 'Schema ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Schema address',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  address: string;

  @ApiProperty({
    description: 'Schema name',
    example: 'User Verification Schema',
  })
  name: string;

  @ApiProperty({
    description: 'Schema definition',
    example: 'string name, uint256 age, bool verified',
  })
  schema: string;

  @ApiProperty({
    description: 'Whether the schema is revokable',
    example: true,
  })
  revokable: boolean;

  @ApiProperty({
    description: 'Whether the schema has a resolver',
    example: true,
  })
  resolver: boolean;

  @ApiProperty({
    description: 'Schema creator address',
    example: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  })
  creator: string;

  @ApiProperty({
    description: 'Schema creation timestamp',
    example: '1699123456000',
  })
  created_at: string;

  @ApiProperty({
    description: 'Transaction hash of schema creation',
    example: '0xdef456789012345678901234567890123456789012345678901234567890abcd',
  })
  tx_hash: string;

  @ApiProperty({
    description: 'Number of attestations using this schema',
    example: 42,
    required: false,
  })
  attestation_cnt?: number;
}

export class AttestationResponseDto {
  @ApiProperty({
    description: 'Attestation ID',
    example: 1,
    required: false,
  })
  id?: number;

  @ApiProperty({
    description: 'Attestation address',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  address: string;

  @ApiProperty({
    description: 'Schema address used for this attestation',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  schema: string;

  @ApiProperty({
    description: 'Reference attestation address',
    example: '0x0000000000000000000000000000000000000000000000000000000000000000',
  })
  ref_attestation: string;

  @ApiProperty({
    description: 'Attestation creation timestamp',
    example: '1699123456000',
  })
  time: string;

  @ApiProperty({
    description: 'Attestation expiration timestamp',
    example: '1699999999000',
  })
  expiration_time: string;

  @ApiProperty({
    description: 'Attestation revocation timestamp (0 if not revoked)',
    example: '0',
  })
  revocation_time: string;

  @ApiProperty({
    description: 'Attestor address',
    example: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  })
  attestor: string;

  @ApiProperty({
    description: 'Recipient address',
    example: '0x5555555555555555555555555555555555555555555555555555555555555555',
  })
  recipient: string;

  @ApiProperty({
    description: 'Storage type (0: ON_CHAIN, 1: OFF_CHAIN)',
    example: 0,
  })
  storage_type: number;

  @ApiProperty({
    description: 'Attestation data (for ON_CHAIN storage)',
    example: '0x1234567890abcdef',
    required: false,
  })
  data?: string | null;

  @ApiProperty({
    description: 'Walrus Sui object ID (for OFF_CHAIN storage)',
    example: '0x...',
    required: false,
  })
  walrus_sui_object_id?: string | null;

  @ApiProperty({
    description: 'Walrus blob ID (base64url string, for OFF_CHAIN storage)',
    example: 'b6CoN4a38EN53OKgXEur1t0LVoy6BR_PCtP_qC1y0n4',
    required: false,
  })
  walrus_blob_id?: string | null;

  @ApiProperty({
    description: 'Data hash (for OFF_CHAIN storage)',
    example: '0x...',
    required: false,
  })
  data_hash?: string | null;

  @ApiProperty({
    description: 'Whether data is encrypted',
    example: false,
  })
  encrypted: boolean;

  @ApiProperty({
    description: 'Seal encryption nonce (hex string, for encrypted OFF_CHAIN storage)',
    example: '0x1234...',
    required: false,
  })
  seal_nonce?: string | null;

  @ApiProperty({
    description: 'Seal policy ID (for other access patterns, optional)',
    example: '0x...',
    required: false,
  })
  seal_policy_id?: string | null;

  @ApiProperty({
    description: 'Attestation name',
    example: 'User Verification',
    required: false,
  })
  name?: string | null;

  @ApiProperty({
    description: 'Attestation description',
    example: 'User verification attestation',
    required: false,
  })
  description?: string | null;

  @ApiProperty({
    description: 'Attestation URL',
    example: 'https://example.com',
    required: false,
  })
  url?: string | null;

  @ApiProperty({
    description: 'Transaction hash of attestation creation',
    example: '0xdef456789012345678901234567890123456789012345678901234567890abcd',
  })
  tx_hash: string;
}

export class AttestationWithSchemaResponseDto extends AttestationResponseDto {
  @ApiProperty({
    description: 'Schema ID',
    example: 1,
    required: false,
  })
  schema_id?: number;

  @ApiProperty({
    description: 'Schema name',
    example: 'User Verification Schema',
    required: false,
  })
  schema_name?: string;

  @ApiProperty({
    description: 'Schema address',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    required: false,
  })
  schema_address?: string;

  @ApiProperty({
    description: 'Schema definition',
    example: 'string name, uint256 age, bool verified',
    required: false,
  })
  schema_data?: string;
}

export class CountResponseDto {
  @ApiProperty({
    description: 'Count result',
    example: 42,
  })
  count: number;
}

export class PaginationInfoDto implements PaginationInfo {
  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Whether there are more pages available',
    example: true,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;
}

export class PaginatedSchemasResponseDto implements ApiResponse<SchemaResponseDto[]> {
  @ApiProperty({
    description: 'List of schemas',
    type: [SchemaResponseDto],
  })
  data: SchemaResponseDto[];

  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Successfully retrieved schemas',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationInfoDto,
  })
  pagination: PaginationInfo;
}

export class PaginatedAttestationsResponseDto implements ApiResponse<AttestationWithSchemaResponseDto[]> {
  @ApiProperty({
    description: 'List of attestations with schema information',
    type: [AttestationWithSchemaResponseDto],
  })
  data: AttestationWithSchemaResponseDto[];

  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Successfully retrieved attestations',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationInfoDto,
  })
  pagination: PaginationInfo;
}

export class SingleSchemaResponseDto implements ApiResponse<SchemaResponseDto> {
  @ApiProperty({
    description: 'Schema data',
    type: SchemaResponseDto,
  })
  data: SchemaResponseDto;

  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Successfully retrieved schema',
    required: false,
  })
  message?: string;
}

export class SingleAttestationResponseDto implements ApiResponse<AttestationWithSchemaResponseDto> {
  @ApiProperty({
    description: 'Attestation data',
    type: AttestationWithSchemaResponseDto,
  })
  data: AttestationWithSchemaResponseDto;

  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Successfully retrieved attestation',
    required: false,
  })
  message?: string;
}

export class CountApiResponseDto implements ApiResponse<CountResponseDto> {
  @ApiProperty({
    description: 'Count data',
    type: CountResponseDto,
  })
  data: CountResponseDto;

  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Successfully retrieved count',
    required: false,
  })
  message?: string;
}

