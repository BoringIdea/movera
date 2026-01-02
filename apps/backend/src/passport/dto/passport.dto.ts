import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckUserDto {
  @ApiProperty({ description: 'User wallet address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Blockchain network (aptos, sui, movement)' })
  @IsString()
  @IsNotEmpty()
  chain: string;
}

export class RegisterUserDto {
  @ApiProperty({ description: 'User wallet address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Blockchain network (aptos, sui, movement)' })
  @IsString()
  @IsNotEmpty()
  chain: string;

  @ApiProperty({ description: 'Message that was signed' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Signature of the message' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class GetUserPassportDataDto {
  @ApiProperty({ description: 'User wallet address' })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiProperty({ description: 'Blockchain network (aptos, sui, movement)' })
  @IsString()
  @IsNotEmpty()
  chain: string;
}
