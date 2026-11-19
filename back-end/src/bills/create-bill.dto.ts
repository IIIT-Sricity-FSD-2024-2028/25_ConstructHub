import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateBillDto {
  @ApiPropertyOptional({ description: 'Company ID bill belongs to', example: 'COMP001' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: 'ID of the project', example: 'P001' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ description: 'Name of the project', example: 'Skyline Tower' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ description: 'Client ID', example: 'U005' })
  @IsString()
  @IsOptional()
  clientId: string;

  @ApiPropertyOptional({ description: 'Client name', example: 'Vikram Patel' })
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiPropertyOptional({ description: 'Bill amount', example: 2500000 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount: number;

  @ApiPropertyOptional({ description: 'Milestone associated with the bill', example: 'Foundation Complete' })
  @IsString()
  @IsOptional()
  milestone: string;

  @ApiPropertyOptional({ description: 'Bill description', example: 'Billing for completed foundation work...' })
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({ description: 'ID of the user who generated the bill', example: 'U004' })
  @IsString()
  @IsOptional()
  generatedBy: string;

  @ApiPropertyOptional({ description: 'Status of the bill', example: 'Approved' })
  @IsString()
  @IsOptional()
  status: string;

  @ApiPropertyOptional({ description: 'Date of decision', example: '2026-03-05' })
  @IsString()
  @IsOptional()
  decisionDate?: string;

  @ApiPropertyOptional({ description: 'Due date for the bill', example: '2026-03-11' })
  @IsString()
  @IsOptional()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Reason for rejection if any', example: '' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Completed milestone this bill is for (required on projects with milestones). The amount is then the quoted stage amount.', example: 'MS001' })
  @IsString()
  @IsOptional()
  milestoneId?: string;
}
