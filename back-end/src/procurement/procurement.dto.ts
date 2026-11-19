import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsEmail, Min, Max, MinLength, MaxLength, Matches,
  IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ───────── suppliers ─────────
export class CreateSupplierDto {
  @ApiProperty({ example: 'Shree Cement Traders' })
  @IsString() @MinLength(2) @MaxLength(120)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  contactPerson?: string;

  @ApiPropertyOptional({ example: '9822012345' })
  @IsOptional() @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ example: '27ABCDE1234F1Z5' })
  @IsOptional() @Matches(/^[0-9A-Z]{15}$/, { message: 'GSTIN must be 15 characters (capital letters and digits)' })
  gstin?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: 'What this supplier usually provides' }) @IsOptional() @IsString() @MaxLength(200)
  materials?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional() @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

// ───────── material requests ─────────
export class RequestItemDto {
  @ApiProperty({ example: 'Cement OPC 53 grade' })
  @IsString() @MinLength(2) @MaxLength(200)
  description: string;

  @ApiProperty({ example: 'bags' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  unit: string;

  @ApiProperty({ example: 200 })
  @IsNumber() @Min(0.001) @Max(10000000)
  quantity: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  specification?: string;
}

export class CreateMaterialRequestDto {
  @ApiProperty({ example: 'P001' })
  @IsString() @IsNotEmpty()
  projectId: string;

  @ApiProperty({ type: [RequestItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => RequestItemDto)
  items: RequestItemDto[];

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional() @Matches(DATE_RE, { message: 'neededBy must be YYYY-MM-DD' })
  neededBy?: string;

  @ApiPropertyOptional({ enum: ['Low', 'Medium', 'High'] })
  @IsOptional() @IsIn(['Low', 'Medium', 'High'])
  priority?: 'Low' | 'Medium' | 'High';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}

export class DecisionDto {
  @ApiPropertyOptional({ description: 'Required when rejecting' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

// ───────── purchase orders ─────────
export class PoItemDto {
  @ApiProperty({ example: 'I1', description: 'Item id inside the approved material request' })
  @IsString() @IsNotEmpty()
  requestItemId: string;

  @ApiProperty({ example: 200 })
  @IsNumber() @Min(0.001) @Max(10000000)
  quantity: number;

  @ApiProperty({ example: 380, description: 'Rate per unit in INR' })
  @IsNumber() @Min(0.01) @Max(1000000000)
  rate: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 'MR001' })
  @IsString() @IsNotEmpty()
  requestId: string;

  @ApiProperty({ example: 'SUP001' })
  @IsString() @IsNotEmpty()
  supplierId: string;

  @ApiProperty({ type: [PoItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => PoItemDto)
  items: PoItemDto[];

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional() @Matches(DATE_RE, { message: 'expectedDelivery must be YYYY-MM-DD' })
  expectedDelivery?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}

export class CancelDto {
  @ApiProperty({ example: 'Supplier could not meet the delivery date' })
  @IsString() @MinLength(3) @MaxLength(300)
  reason: string;
}

// ───────── goods receipts ─────────
export class ReceiptItemDto {
  @ApiProperty({ example: 'L1' })
  @IsString() @IsNotEmpty()
  poItemId: string;

  @ApiProperty({ example: 120 })
  @IsNumber() @Min(0) @Max(10000000)
  receivedQuantity: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  remarks?: string;
}

export class CreateGoodsReceiptDto {
  @ApiProperty({ example: 'PO001' })
  @IsString() @IsNotEmpty()
  poId: string;

  @ApiProperty({ type: [ReceiptItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];

  @ApiPropertyOptional({ example: 'DC-4471' })
  @IsOptional() @IsString() @MaxLength(60)
  deliveryNote?: string;

  @ApiPropertyOptional({ example: '2026-11-08' })
  @IsOptional() @Matches(DATE_RE, { message: 'receivedDate must be YYYY-MM-DD' })
  receivedDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Milestone this delivery is for', example: 'MS001' })
  @IsOptional() @IsString() @MaxLength(40)
  milestoneId?: string;
}

// ───────── stock issue / settings ─────────
export class IssueItemDto {
  @ApiProperty({ example: 'STK001' })
  @IsString() @IsNotEmpty()
  stockId: string;

  @ApiProperty({ example: 20 })
  @IsNumber() @Min(0.001) @Max(10000000)
  quantity: number;

  @ApiPropertyOptional({ description: 'Optional material request item ID fulfilled by this stock issue' })
  @IsOptional() @IsString()
  requestItemId?: string;
}

export class CreateMaterialIssueDto {
  @ApiProperty({ type: [IssueItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => IssueItemDto)
  items: IssueItemDto[];

  @ApiPropertyOptional({ description: 'Site engineer who receives the material' })
  @IsOptional() @IsString()
  issuedTo?: string;

  @ApiPropertyOptional({ description: 'Task the material is used for' })
  @IsOptional() @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Optional material request ID fulfilled from site stock' })
  @IsOptional() @IsString()
  requestId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class UpdateProcurementSettingsDto {
  @ApiProperty({ example: 100000, description: 'Purchase orders above this amount need Finance Manager approval' })
  @IsInt() @Min(0) @Max(1000000000)
  poApprovalLimit: number;
}
