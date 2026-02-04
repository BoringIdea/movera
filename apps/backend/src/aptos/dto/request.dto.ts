import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ShelbyUploadRequestDto {
  @ApiProperty({
    description: 'Schema name (used to generate blob path)',
    example: 'user-profile',
  })
  @IsString()
  schema_name: string;

  @ApiProperty({
    description: 'Base64-encoded attestation data',
    example: 'SGVsbG8gTW92ZSBBdHRlc3RhdGlvbg==',
  })
  @IsString()
  data_base64: string;
}
