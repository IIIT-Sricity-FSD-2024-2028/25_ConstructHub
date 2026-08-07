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

  @ApiProperty({ description: 'Role of the user', enum: ['superuser', 'project_manager', 'site_engineer', 'finance_manager', 'client'] })
  @IsIn(['superuser', 'project_manager', 'site_engineer', 'finance_manager', 'client'])
  @IsNotEmpty()
  role: string;

  @ApiProperty({ description: 'Phone number of the user', example: '+91 98765 43210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

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
