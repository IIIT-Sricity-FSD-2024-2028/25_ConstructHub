import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateBillDto {
  @ApiProperty({ description: 'ID of the project', example: 'P001' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ description: 'Name of the project', example: 'Skyline Tower' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiProperty({ description: 'Client ID', example: 'U005' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ description: 'Client name', example: 'Vikram Patel' })
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiProperty({ description: 'Bill amount', example: 2500000 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Milestone associated with the bill', example: 'Foundation Complete' })
  @IsString()
  @IsNotEmpty()
  milestone: string;

  @ApiProperty({ description: 'Bill description', example: 'Billing for completed foundation work...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'ID of the user who generated the bill', example: 'U004' })
  @IsString()
  @IsNotEmpty()
  generatedBy: string;

  @ApiProperty({ description: 'Status of the bill', example: 'Approved' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ description: 'Date of decision', example: '2026-03-05' })
  @IsString()
  @IsOptional()
  decisionDate?: string;

  @ApiProperty({ description: 'Due date for the bill', example: '2026-03-11' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Reason for rejection if any', example: '' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
