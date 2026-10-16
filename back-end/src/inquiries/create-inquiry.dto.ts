import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, Matches, MinLength, IsOptional } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({ description: 'Full name of inquirer', example: 'Ramesh Patel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email address of inquirer', example: 'ramesh@shapoorji.com' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '10-digit mobile number', example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Please enter a valid 10-digit phone number' })
  phone: string;

  @ApiProperty({ description: 'Company or Firm Name', example: 'Apex Builders Ltd', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ description: 'Inquiry type', example: 'firm_request', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Inquiry message body', example: 'Interested in Construct Hub Enterprise plan.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Message must be at least 5 characters long' })
  message: string;
}
