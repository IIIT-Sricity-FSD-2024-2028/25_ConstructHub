import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOverageRatesDto {
  @ApiProperty({ required: false, example: 499 })
  @IsNumber()
  @Min(0)
  @Max(1000000)
  @IsOptional()
  extraUserMonthly?: number;

  @ApiProperty({ required: false, example: 1999 })
  @IsNumber()
  @Min(0)
  @Max(1000000)
  @IsOptional()
  extraProjectMonthly?: number;
}
