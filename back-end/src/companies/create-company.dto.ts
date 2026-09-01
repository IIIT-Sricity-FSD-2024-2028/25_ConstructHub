import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsIn, Matches } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Name of the construction company', example: 'Apex Builders' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unique company code or slug', example: 'apex' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Approved email domain for company users', example: 'apex.com' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ description: 'Owner or Primary Admin Email', example: 'admin@apex.com' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '9800011111' })
  @IsString()
  @Matches(/^(?!0{10})\d{10}$/, { message: 'Phone number must be exactly 10 numeric digits and cannot be all zeros' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Company subscription plan', enum: ['Basic', 'Pro', 'Enterprise'], default: 'Enterprise' })
  @IsIn(['Basic', 'Pro', 'Enterprise'])
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({ description: 'Status of company', enum: ['active', 'inactive'], default: 'active' })
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
