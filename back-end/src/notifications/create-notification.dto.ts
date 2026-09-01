import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'Company ID notification belongs to', example: 'COMP001' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: 'ID of the user this notification belongs to', example: 'U002' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: 'Type of notification', example: 'task' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Notification title', example: 'Task Completed' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Notification body text', example: 'Foundation work has been completed' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ description: 'Notification message text', example: 'Foundation work has been completed' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ description: 'Time description', example: '2 hours ago' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ description: 'Read status', example: false })
  @IsBoolean()
  @IsOptional()
  read?: boolean;
}
