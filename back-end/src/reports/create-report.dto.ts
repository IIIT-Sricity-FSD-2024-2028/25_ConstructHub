import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class MaterialDto {
  @ApiProperty({ example: 'Cement' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  qty: number;

  @ApiProperty({ example: 'bags' })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreateReportDto {
  @ApiProperty({ description: 'Title of the report', example: 'Foundation Inspection Report' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'ID of the project', example: 'P001' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ description: 'Name of the project', example: 'Skyline Tower' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiProperty({ description: 'ID of user who submitted the report', example: 'U006' })
  @IsString()
  @IsNotEmpty()
  submittedBy: string;

  @ApiPropertyOptional({ description: 'Name of user who submitted', example: 'Amit Sharma' })
  @IsString()
  @IsOptional()
  submittedName?: string;

  @ApiProperty({ description: 'Date of the report', example: '2026-03-06' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Progress percentage', example: 75 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  progress: number;

  @ApiProperty({ description: 'Status of the report/work', example: 'Completed' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Details of work done', example: 'Completed foundation inspection...' })
  @IsString()
  @IsNotEmpty()
  workDone: string;

  @ApiPropertyOptional({ description: 'Issues encountered', example: 'Minor crack found...' })
  @IsString()
  @IsOptional()
  issues?: string;

  @ApiProperty({ description: 'Priority level', example: 'Medium' })
  @IsString()
  @IsNotEmpty()
  priority: string;

  @ApiProperty({ description: 'List of materials used', type: [MaterialDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDto)
  materials: MaterialDto[];

  @ApiProperty({ description: 'Number of photos attached', example: 8 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  photos: number;

  @ApiPropertyOptional({
    description: 'Photo URLs or data URLs attached to the report',
    example: ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photoUrls?: string[];

  @ApiPropertyOptional({ description: 'Optional description for uploaded photos', example: 'Foundation and slab progress photos.' })
  @IsString()
  @IsOptional()
  photoDescription?: string;

  @ApiPropertyOptional({ description: 'Additional remarks', example: 'Overall progress satisfactory.' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
