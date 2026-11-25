import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'Required when you change your OWN password: your current password.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentPassword?: string;
}
