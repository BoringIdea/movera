import { Controller, Get, Query, Param, ValidationPipe, UsePipes, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SuiService } from './sui.service';
import {
  PaginationQueryDto,
  SchemaAddressParamDto,
  AttestationAddressParamDto,
  UserAddressParamDto,
  SearchSchemaQueryDto,
} from './dto/query-params.dto';
import {
  SchemaResponseDto,
  AttestationWithSchemaResponseDto,
  CountResponseDto,
  PaginatedSchemasResponseDto,
  PaginatedAttestationsResponseDto,
  SingleSchemaResponseDto,
  SingleAttestationResponseDto,
  CountApiResponseDto,
} from './dto/response.dto';
import { ApiResponse as IApiResponse } from '../common';
import { ResponseUtil } from '../common/utils/response.util';

@ApiTags('Sui Attestation Service')
@Controller('api/v1/sui')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SuiController {
  constructor(private readonly suiService: SuiService) {}

  // Schema Endpoints
  @Get('schemas')
  @ApiOperation({
    summary: 'Get schemas with pagination',
    description: 'Retrieve a paginated list of all schemas in the system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved schemas',
    type: PaginatedSchemasResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pagination parameters',
  })
  async getSchemas(@Query() query: PaginationQueryDto): Promise<IApiResponse<any[]>> {
    const paginationData = await this.suiService.getSchemasWithPagination(
      query.offset || 0,
      query.limit || 10,
    );

    return ResponseUtil.successPaginated(
      paginationData.items,
      paginationData.total,
      Math.floor(paginationData.offset / paginationData.limit) + 1,
      paginationData.limit,
      'Successfully retrieved schemas',
    );
  }

  @Get('schemas/search')
  @ApiOperation({
    summary: 'Search schemas',
    description: 'Search for schemas by ID or address',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully found schemas',
    type: [SchemaResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  async searchSchemas(@Query() query: SearchSchemaQueryDto): Promise<IApiResponse<SchemaResponseDto[]>> {
    const schemas = await this.suiService.searchSchema(query.searchInput);
    return ResponseUtil.success(schemas, 'Successfully found schemas');
  }

  @Get('schemas/count')
  @ApiOperation({
    summary: 'Get total schema count',
    description: 'Get the total number of schemas in the system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved schema count',
    type: CountApiResponseDto,
  })
  async getSchemaCount(): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getSchemaCount();
    return ResponseUtil.success({ count }, 'Successfully retrieved schema count');
  }

  @Get('schemas/creators/count')
  @ApiOperation({
    summary: 'Get schema creator count',
    description: 'Get the total number of unique schema creators',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved schema creator count',
    type: CountApiResponseDto,
  })
  async getSchemaCreatorCount(): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getSchemaCreatorCnt();
    return ResponseUtil.success({ count }, 'Successfully retrieved schema creator count');
  }

  @Get('schemas/:schemaAddress')
  @ApiOperation({
    summary: 'Get schema by address',
    description: 'Retrieve a specific schema by its address',
  })
  @ApiParam({
    name: 'schemaAddress',
    description: 'The address of the schema',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved schema',
    type: SingleSchemaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Schema not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid schema address',
  })
  async getSchemaByAddress(@Param('schemaAddress') schemaAddress: string): Promise<IApiResponse<SchemaResponseDto>> {
    const schema = await this.suiService.findSchemaByAddress(schemaAddress);
    if (!schema) {
      return ResponseUtil.error('Schema not found');
    }
    return ResponseUtil.success(schema, 'Successfully retrieved schema');
  }

  // Attestation Endpoints
  @Get('attestations')
  @ApiOperation({
    summary: 'Get attestations with pagination',
    description: 'Retrieve a paginated list of all attestations with their associated schema information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestations',
    type: PaginatedAttestationsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pagination parameters',
  })
  async getAttestations(@Query() query: PaginationQueryDto): Promise<IApiResponse<any[]>> {
    const paginationData = await this.suiService.getAttestationsWithPagination(
      query.offset || 0,
      query.limit || 10,
    );

    return ResponseUtil.successPaginated(
      paginationData.items,
      paginationData.total,
      Math.floor(paginationData.offset / paginationData.limit) + 1,
      paginationData.limit,
      'Successfully retrieved attestations',
    );
  }

  @Get('attestations/count')
  @ApiOperation({
    summary: 'Get total attestation count',
    description: 'Get the total number of attestations in the system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestation count',
    type: CountApiResponseDto,
  })
  async getAttestationCount(): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getAttestationCount();
    return ResponseUtil.success({ count }, 'Successfully retrieved attestation count');
  }

  @Get('attestations/attestors/count')
  @ApiOperation({
    summary: 'Get attestor count',
    description: 'Get the total number of unique attestors',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestor count',
    type: CountApiResponseDto,
  })
  async getAttestorCount(): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getAttestorCount();
    return ResponseUtil.success({ count }, 'Successfully retrieved attestor count');
  }

  @Get('attestations/schemas/:schema')
  @ApiOperation({
    summary: 'Get attestations by schema',
    description: 'Retrieve attestations that use a specific schema',
  })
  @ApiParam({
    name: 'schema',
    description: 'The address of the schema',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestations',
    type: [AttestationWithSchemaResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid schema address or pagination parameters',
  })
  async getAttestationsBySchema(
    @Param('schema') schema: string,
    @Query() query: PaginationQueryDto,
  ): Promise<IApiResponse<any[]>> {
    const paginationData = await this.suiService.getAttestationsBySchemaWithPagination(
      schema,
      query.offset || 0,
      query.limit || 10,
    );

    return ResponseUtil.successPaginated(
      paginationData.items,
      paginationData.total,
      Math.floor(paginationData.offset / paginationData.limit) + 1,
      paginationData.limit,
      'Successfully retrieved attestations by schema',
    );
  }

  @Get('attestations/schemas/:schema/count')
  @ApiOperation({
    summary: 'Get attestation count by schema',
    description: 'Get the number of attestations for a specific schema',
  })
  @ApiParam({
    name: 'schema',
    description: 'The address of the schema',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestation count',
    type: CountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid schema address',
  })
  async getAttestationCountBySchema(@Param('schema') schema: string): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getAttestationCntBySchema(schema);
    return ResponseUtil.success({ count }, 'Successfully retrieved attestation count by schema');
  }

  @Get('attestations/users/:address')
  @ApiOperation({
    summary: 'Get attestations by user',
    description: 'Retrieve attestations where the user is either attestor or recipient',
  })
  @ApiParam({
    name: 'address',
    description: 'The user address',
    example: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestations',
    type: [AttestationWithSchemaResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user address or pagination parameters',
  })
  async getAttestationsByUser(
    @Param('address') address: string,
    @Query() query: PaginationQueryDto,
  ): Promise<IApiResponse<any[]>> {
    const paginationData = await this.suiService.getAttestationsByUserWithPagination(
      address,
      query.offset || 0,
      query.limit || 10,
    );

    return ResponseUtil.successPaginated(
      paginationData.items,
      paginationData.total,
      Math.floor(paginationData.offset / paginationData.limit) + 1,
      paginationData.limit,
      'Successfully retrieved attestations by user',
    );
  }

  @Get('attestations/users/:address/count')
  @ApiOperation({
    summary: 'Get attestation count by user',
    description: 'Get the number of attestations where the user is either attestor or recipient',
  })
  @ApiParam({
    name: 'address',
    description: 'The user address',
    example: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestation count',
    type: CountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user address',
  })
  async getAttestationCountByUser(@Param('address') address: string): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getAttestationCntByUser(address);
    return ResponseUtil.success({ count }, 'Successfully retrieved attestation count by user');
  }

  @Get('attestations/creators/:address/count')
  @ApiOperation({
    summary: 'Get attestation count by creator',
    description: 'Get the number of attestations created by a specific address',
  })
  @ApiParam({
    name: 'address',
    description: 'The creator address',
    example: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestation count',
    type: CountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid creator address',
  })
  async getAttestationCountByCreator(@Param('address') address: string): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getAttestationCntByCreator(address);
    return ResponseUtil.success({ count }, 'Successfully retrieved attestation count by creator');
  }

  @Get('attestations/recipients/:address/count')
  @ApiOperation({
    summary: 'Get attestation count by recipient',
    description: 'Get the number of attestations received by a specific address',
  })
  @ApiParam({
    name: 'address',
    description: 'The recipient address',
    example: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestation count',
    type: CountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid recipient address',
  })
  async getAttestationCountByRecipient(@Param('address') address: string): Promise<IApiResponse<CountResponseDto>> {
    const count = await this.suiService.getAttestationCntByRecipient(address);
    return ResponseUtil.success({ count }, 'Successfully retrieved attestation count by recipient');
  }

  @Get('attestations/:address')
  @ApiOperation({
    summary: 'Get attestation by address',
    description: 'Retrieve a specific attestation with its schema information by address',
  })
  @ApiParam({
    name: 'address',
    description: 'The attestation address',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved attestation',
    type: SingleAttestationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Attestation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid attestation address',
  })
  async getAttestationByAddress(@Param('address') address: string): Promise<IApiResponse<AttestationWithSchemaResponseDto>> {
    const attestation = await this.suiService.getAttestationAndSchema(address);
    if (!attestation) {
      return ResponseUtil.error('Attestation not found');
    }
    return ResponseUtil.success(attestation, 'Successfully retrieved attestation');
  }
}
