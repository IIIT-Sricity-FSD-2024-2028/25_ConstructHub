import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn, Min, Max, MinLength, MaxLength, Matches } from 'class-validator';

export const EXPENSE_CATEGORIES = ['Materials', 'Labor', 'Equipment', 'Transport', 'Safety', 'Other'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A site engineer submits an expense claim. Status, ids and company are always set by the server. */
export class CreateExpenseDto {
  @ApiProperty({ description: 'Project the cost belongs to', example: 'P001' })
  @IsString() @IsNotEmpty()
  projectId: string;

  @ApiProperty({ enum: EXPENSE_CATEGORIES, example: 'Materials' })
  @IsIn(EXPENSE_CATEGORIES)
  category: string;

  @ApiProperty({ description: 'Amount in INR', example: 4500 })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(100000000)
  amount: number;

  @ApiProperty({ description: 'Date the money was spent', example: '2026-11-08' })
  @Matches(DATE_RE, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: 'Diesel for the concrete mixer' })
  @IsString() @MinLength(3) @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Milestone the cost belongs to (required on projects that have milestones)', example: 'MS001' })
  @IsOptional() @IsString() @MaxLength(40)
  milestoneId?: string;
}

export class DecisionNoteDto {
  @ApiPropertyOptional({ description: 'Required when returning or rejecting (and when approving over budget)' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

export class ReimburseDto {
  @ApiPropertyOptional({ description: 'Payment reference (UPI id, transfer no., voucher no.)', example: 'UPI-88213' })
  @IsOptional() @IsString() @MaxLength(80)
  reference?: string;
}
