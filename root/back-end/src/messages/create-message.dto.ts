import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID of the sender', example: 'U002' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiPropertyOptional({ description: 'Name of the sender', example: 'Rajesh Kumar' })
  @IsString()
  @IsOptional()
  fromName?: string;

  @ApiProperty({ description: 'ID of the recipient', example: 'U003' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({ description: 'Name of the recipient', example: 'Priya Sharma' })
  @IsString()
  @IsOptional()
  toName?: string;

  @ApiProperty({ description: 'Message text content', example: 'Please review the updated project timeline.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: 'Time message was sent', example: '10:30 AM' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ description: 'Date message was sent', example: '2026-03-24' })
  @IsString()
  @IsOptional()
  date?: string;
}
