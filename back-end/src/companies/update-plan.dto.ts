import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiProperty({ required: false, example: 4999 })
  @IsNumber()
  @Min(0)
  @Max(10000000)
  @IsOptional()
  monthlyPrice?: number;

  @ApiProperty({ required: false, example: 49990 })
  @IsNumber()
  @Min(0)
  @Max(100000000)
  @IsOptional()
  annualPrice?: number;

  @ApiProperty({ required: false, example: 10 })
  @IsInt()
  @Min(1)
  @Max(100000)
  @IsOptional()
  userLimit?: number;

  @ApiProperty({ required: false, example: 3 })
  @IsInt()
  @Min(1)
  @Max(100000)
  @IsOptional()
  projectLimit?: number;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  description?: string;
}
