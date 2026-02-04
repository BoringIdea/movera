import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class WalrusUploadRequestDto {
  @ApiProperty({
    description: 'Base64-encoded attestation data (encrypted or raw)',
    example: 'SGVsbG8gTW92ZSBBdHRlc3RhdGlvbg==',
  })
  @IsString()
  data_base64: string;
}
