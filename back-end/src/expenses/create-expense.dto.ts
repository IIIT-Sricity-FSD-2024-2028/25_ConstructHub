import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ description: 'ID of the project', example: 'P001' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ description: 'Name of the project', example: 'Skyline Tower' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiProperty({ description: 'Expense category', example: 'Materials' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Expense amount', example: 850000 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Expense description', example: 'Cement and steel for foundation' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Date of expense', example: '2026-03-01' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'ID of user who recorded expense', example: 'U004' })
  @IsString()
  @IsNotEmpty()
  recordedBy: string;

  @ApiPropertyOptional({ description: 'Receipt file name or URL', example: 'receipt_001.pdf' })
  @IsString()
  @IsOptional()
  receipt?: string;
}
