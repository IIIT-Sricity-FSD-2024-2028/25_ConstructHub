import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @ApiPropertyOptional({ description: 'Company ID message belongs to', example: 'COMP001' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'ID of the sender', example: 'U002' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'ID of the sender', example: 'U002' })
  @IsString()
  @IsOptional()
  senderId?: string;

  @ApiPropertyOptional({ description: 'Name of the sender', example: 'Rajesh Kumar' })
  @IsString()
  @IsOptional()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Name of the sender', example: 'Rajesh Kumar' })
  @IsString()
  @IsOptional()
  senderName?: string;

  @ApiPropertyOptional({ description: 'ID of the recipient', example: 'U003' })
  @IsString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ description: 'ID of the recipient', example: 'U003' })
  @IsString()
  @IsOptional()
  receiverId?: string;

  @ApiPropertyOptional({ description: 'Name of the recipient', example: 'Priya Sharma' })
  @IsString()
  @IsOptional()
  toName?: string;

  @ApiPropertyOptional({ description: 'Name of the recipient', example: 'Priya Sharma' })
  @IsString()
  @IsOptional()
  receiverName?: string;

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
