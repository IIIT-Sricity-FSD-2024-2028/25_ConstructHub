import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterClientDto {
  @ApiProperty({ example: 'Vikram Patel' })
  @IsString() @IsNotEmpty() @MaxLength(80)
  @Matches(/^[A-Za-z][A-Za-z .'-]*$/, { message: 'Name may contain only letters, spaces, dots, apostrophes and hyphens' })
  name: string;

  @ApiProperty({ example: 'vikram@gmail.com' })
  @IsEmail() @MaxLength(120)
  email: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional() @IsString()
  @Matches(/^(?!0{10})\d{10}$/, { message: 'Phone number must be exactly 10 digits and cannot be all zeros' })
  phone?: string;
}
