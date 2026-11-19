import {
  IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min, Max, MaxLength, Matches,
  IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QuotationItemDto {
  @ApiProperty({ example: 'Foundation and RCC structure' })
  @IsString() @IsNotEmpty() @MaxLength(300)
  description: string;

  @ApiProperty({ example: 'sq ft' })
  @IsString() @IsNotEmpty() @MaxLength(30)
  unit: string;

  @ApiProperty({ example: 2400 })
  @IsNumber() @Min(0.001) @Max(1000000000)
  quantity: number;

  @ApiProperty({ example: 950 })
  @IsNumber() @Min(0) @Max(1000000000)
  rate: number;
}

export class SaveQuotationDto {
  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];

  @ApiProperty({ example: 240, description: 'Estimated duration in days' })
  @IsInt() @Min(1) @Max(3650)
  durationDays: number;

  @ApiProperty({ required: false, example: '2027-03-31', description: 'Last date this quotation is valid' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validUntil must be YYYY-MM-DD' })
  validUntil?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class RejectQuotationDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}


// ───────────── 3-role estimation (Company Admin -> PM -> FM -> Company Admin) ─────────────

export class AssignTeamDto {
  @ApiProperty({ example: 'U002', description: 'Project Manager of this company who defines the milestone stages' })
  @IsString() @IsNotEmpty()
  pmId: string;

  @ApiProperty({ example: 'U004', description: 'Finance Manager of this company who prices the stages' })
  @IsString() @IsNotEmpty()
  fmId: string;
}

export class PmStageDto {
  @ApiProperty({ example: 'Foundation and plinth' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ example: 45 })
  @IsInt() @Min(1) @Max(3650)
  durationDays: number;

  @ApiProperty({ example: 'Cement 400 bags, steel 6 t, aggregate 30 m3' })
  @IsString() @IsNotEmpty() @MaxLength(1000)
  materialScope: string;
}

export class PmEstimateDto {
  @ApiProperty({ type: [PmStageDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PmStageDto)
  milestoneStages: PmStageDto[];

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class FmStageCostDto {
  @ApiProperty({ example: 2000000, description: 'Internal site cost of this stage in INR' })
  @IsNumber() @Min(1) @Max(1000000000)
  internalCost: number;
}

export class FmEstimateDto {
  @ApiProperty({ type: [FmStageCostDto], description: 'One entry per PM stage, in the same order' })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FmStageCostDto)
  stages: FmStageCostDto[];

  @ApiProperty({ example: 15, description: 'Mobilization advance as a percent of the client quote (0 to 50)' })
  @IsNumber() @Min(0) @Max(50)
  mobilizationAdvancePercent: number;
}

export class ReleaseQuotationDto {
  @ApiProperty({ example: 20, description: 'Profit markup percent added on top of the internal base cost (0 to 200)' })
  @IsNumber() @Min(0) @Max(200)
  markupPercent: number;

  @ApiProperty({ required: false, example: 31250000, description: 'Optional target total client quote in INR (two-way synced with markupPercent)' })
  @IsOptional() @IsNumber() @Min(1) @Max(10000000000)
  totalClientQuote?: number;

  @ApiProperty({ required: false, example: '2027-03-31' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validUntil must be YYYY-MM-DD' })
  validUntil?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}
