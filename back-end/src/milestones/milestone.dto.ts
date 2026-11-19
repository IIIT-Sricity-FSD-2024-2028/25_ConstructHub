import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMilestoneDto {
  @ApiProperty({ example: 'P001' })
  @IsString() @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'Foundation' })
  @IsString() @MinLength(3) @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Excavation, footing and foundation concrete.' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '2026-03-15' })
  @Matches(DATE_RE, { message: 'deadline must be YYYY-MM-DD' })
  deadline: string;

  @ApiProperty({ example: 40, description: 'Share of the whole project in percent (1-100). All milestone weights of a project must add up to at most 100.' })
  @IsInt() @Min(1) @Max(100)
  weight: number;
}

export class UpdateMilestoneDto extends PartialType(OmitType(CreateMilestoneDto, ['projectId'] as const)) {}
