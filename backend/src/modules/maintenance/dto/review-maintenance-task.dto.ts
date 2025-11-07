import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewMaintenanceTaskDto {
  @ApiProperty({ description: '是否通过验收' })
  @IsBoolean()
  pass: boolean;

  @ApiProperty({ description: '验收意见', required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
