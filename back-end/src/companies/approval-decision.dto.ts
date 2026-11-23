import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApprovalDecisionDto {
  @ApiProperty({ enum: ['approved', 'rejected'], example: 'approved' })
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @ApiProperty({ required: false, example: 'GST number could not be verified.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
