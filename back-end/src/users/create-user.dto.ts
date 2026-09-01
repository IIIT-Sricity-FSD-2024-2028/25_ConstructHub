import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional, IsIn, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name of the user', example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email address of the user', example: 'rajesh@ch.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password for the user', example: '123456' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Role of the user', enum: ['superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client'] })
  @IsIn(['superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client'])
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional({ description: 'Company ID user belongs to', example: 'COMP001' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Phone number of the user', example: '9876543210' })
  @IsString()
  @Matches(/^(?!0{10})\d{10}$/, { message: 'Phone number must be exactly 10 numeric digits and cannot be all zeros' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar initials or URL', example: 'RK' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: 'Status of the user', enum: ['active', 'inactive'], default: 'active' })
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Date of creation', example: '2026-01-05' })
  @IsString()
  @IsOptional()
  createdAt?: string;
}
