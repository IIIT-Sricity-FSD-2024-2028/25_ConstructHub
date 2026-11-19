import {
  IsString, IsNotEmpty, IsNumber, IsOptional, IsIn, Min, Max, MinLength, MaxLength, Matches, IsInt,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export const PROJECT_TYPES = ['Residential', 'Commercial', 'Renovation', 'Interior', 'Other'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateRequirementDto {
  @ApiProperty({ example: '3BHK independent villa construction' })
  @IsString() @MinLength(5) @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'G+1 villa, ~2,400 sq ft, drawings ready...' })
  @IsString() @MinLength(10) @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 'Pune, Maharashtra' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  location: string;

  @ApiProperty({ enum: PROJECT_TYPES, example: 'Residential' })
  @IsIn(PROJECT_TYPES)
  projectType: string;

  @ApiProperty({ example: 5500000 })
  @IsNumber() @Min(0) @Max(100000000000)
  budgetMin: number;

  @ApiProperty({ example: 7500000 })
  @IsNumber() @Min(0) @Max(100000000000)
  budgetMax: number;

  @ApiProperty({ required: false, example: 240 })
  @IsOptional() @IsInt() @Min(1) @Max(3650)
  expectedDurationDays?: number;

  @ApiProperty({ required: false, example: '2027-03-31', description: 'Last day companies can submit or edit quotations' })
  @IsOptional() @Matches(DATE_RE, { message: 'quotationDeadline must be YYYY-MM-DD' })
  quotationDeadline?: string;

  @ApiProperty({ required: false, example: '2027-04-15' })
  @IsOptional() @Matches(DATE_RE, { message: 'preferredStartDate must be YYYY-MM-DD' })
  preferredStartDate?: string;
}

export class UpdateRequirementDto extends PartialType(CreateRequirementDto) {}
