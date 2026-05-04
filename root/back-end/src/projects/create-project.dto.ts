import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsObject, Min, Max } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Name of the project', example: 'Skyline Tower' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Location of the project', example: 'Mumbai, Maharashtra' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Client ID associated with the project', example: 'U005' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ description: 'Name of the client', example: 'Vikram Patel' })
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiProperty({ description: 'Manager ID associated with the project', example: 'U002' })
  @IsString()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({ description: 'Total budget of the project', example: 25000000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  budget: number;

  @ApiProperty({ description: 'Amount spent so far', example: 18750000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  spent: number;

  @ApiProperty({ description: 'Progress percentage', example: 75 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  progress: number;

  @ApiProperty({ description: 'Current status of the project', example: 'On Track' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Start date of the project', example: '2026-01-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of the project', example: '2026-04-30' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Total team size', example: 24 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  teamSize: number;

  @ApiProperty({ description: 'Budget allocations', example: { Materials: 12000000, Labor: 8000000 } })
  @IsObject()
  @IsNotEmpty()
  allocations: Record<string, number>;

  @ApiProperty({ description: 'Project description', example: 'Residential high-rise' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
