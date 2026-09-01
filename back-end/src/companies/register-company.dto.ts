import { IsString, IsNotEmpty, IsEmail, MinLength, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CompanyDetailsDto {
  @ApiProperty({ example: 'Apex Constructions Ltd' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'apex' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'apex.com' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ example: '+91 98000 11111', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Enterprise', required: false })
  @IsString()
  @IsOptional()
  plan?: string;
}

export class AdminDetailsDto {
  @ApiProperty({ example: 'Siva Sathwik' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@apex.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '+91 98000 11111', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class RegisterCompanyDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => CompanyDetailsDto)
  company: CompanyDetailsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AdminDetailsDto)
  admin: AdminDetailsDto;
}
