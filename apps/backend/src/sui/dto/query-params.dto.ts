import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max, IsNotEmpty } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items to skip',
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset must be greater than or equal to 0' })
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(100, { message: 'Limit must be less than or equal to 100' })
  limit?: number = 10;
}

export class SchemaAddressParamDto {
  @ApiProperty({
    description: 'Schema address in Sui network',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  @IsString({ message: 'Schema address must be a string' })
  @IsNotEmpty({ message: 'Schema address cannot be empty' })
  schemaAddress: string;
}

export class AttestationAddressParamDto {
  @ApiProperty({
    description: 'Attestation address in Sui network',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @IsString({ message: 'Attestation address must be a string' })
  @IsNotEmpty({ message: 'Attestation address cannot be empty' })
  address: string;
}

export class UserAddressParamDto {
  @ApiProperty({
    description: 'User address in Sui network',
    example: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  })
  @IsString({ message: 'User address must be a string' })
  @IsNotEmpty({ message: 'User address cannot be empty' })
  address: string;
}

export class SearchSchemaQueryDto {
  @ApiProperty({
    description: 'Search input for schema (can be schema ID or address)',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  @IsString({ message: 'Search input must be a string' })
  @IsNotEmpty({ message: 'Search input cannot be empty' })
  searchInput: string;
}

