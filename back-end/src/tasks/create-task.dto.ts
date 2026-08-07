import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'Title of the task', example: 'Foundation Concrete Pouring' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'ID of the project this task belongs to', example: 'P001' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ description: 'Name of the project', example: 'Skyline Tower' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiProperty({ description: 'ID of the user assigned to this task', example: 'U003' })
  @IsString()
  @IsNotEmpty()
  assignedTo: string;

  @ApiPropertyOptional({ description: 'Name of the assigned user', example: 'Priya Sharma' })
  @IsString()
  @IsOptional()
  assignedName?: string;

  @ApiProperty({ description: 'Priority of the task', example: 'High' })
  @IsString()
  @IsNotEmpty()
  priority: string;

  @ApiProperty({ description: 'Status of the task', example: 'In Progress' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Progress percentage', example: 75 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  progress: number;

  @ApiProperty({ description: 'Start date', example: '2026-03-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Deadline date', example: '2026-03-08' })
  @IsString()
  @IsNotEmpty()
  deadline: string;

  @ApiProperty({ description: 'Task description', example: 'Complete the foundation...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Remarks or comments', example: '75% done...' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
