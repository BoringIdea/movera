import { Controller, Get, Query, Param } from '@nestjs/common';
import { MovementService } from './movement.service';

@Controller('movement')
export class MovementController {
  constructor(private readonly aptosService: MovementService) {}

  @Get('schemas')
  async getSchemas(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
  ) {
    return this.aptosService.getSchemas(offset, limit);
  }

  @Get('schema/:schemaAddress')
  async getSchema(@Param('schemaAddress') schemaAddress: string) {
    return this.aptosService.findSchemaByAddress(schemaAddress);
  }

  @Get('search-schema')
  async searchSchema(@Query('searchInput') searchInput: string) {
    return this.aptosService.searchSchema(searchInput);
  }

  @Get('schema-count')
  async getSchemaCount() {
    return this.aptosService.getSchemaCount();
  }

  @Get('attestations')
  async getAttestations(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
  ) {
    return this.aptosService.getAttestationsWithSchemas(offset, limit);
  }

  @Get('attestations/schema/:schema')
  async getAttestationsBySchema(
    @Param('schema') schema: string,
    @Query('offset') offset: number,
    @Query('limit') limit: number,
  ) {
    return this.aptosService.getAttestationsBySchema(schema, offset, limit);
  }

  @Get('attestations/user/:address')
  async getAttestationsByUser(
    @Param('address') address: string,
    @Query('offset') offset: number,
    @Query('limit') limit: number,
  ) {
    return this.aptosService.getAttestationsByUser(address, offset, limit);
  }

  @Get('attestation/:address')
  async getAttestation(@Param('address') address: string) {
    return this.aptosService.getAttestationAndSchema(address);
  }

  @Get('attestation-count')
  async getAttestationCount() {
    return this.aptosService.getAttestationCount();
  }

  @Get('attestation-cnt-by-schema/:schema')
  async getAttestationCntBySchema(@Param('schema') schema: string) {
    return this.aptosService.getAttestationCntBySchema(schema);
  }

  @Get('attestation-cnt-by-user/:address')
  async getAttestationCntByUser(@Param('address') address: string) {
    return this.aptosService.getAttestationCntByUser(address);
  }

  @Get('attestation-cnt-by-creator/:address')
  async getAttestationCntByCreator(@Param('address') address: string) {
    return this.aptosService.getAttestationCntByCreator(address);
  }

  @Get('attestation-cnt-by-recipient/:address')
  async getAttestationCntByRecipient(@Param('address') address: string) {
    return this.aptosService.getAttestationCntByRecipient(address);
  }

  @Get('attestor-count')
  async getAttestorCount() {
    return this.aptosService.getAttestorCount();
  }

  @Get('schema-creator-cnt')
  async getSchemaCreatorCnt() {
    return this.aptosService.getSchemaCreatorCnt();
  }
}
