import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateWorkshopDto {
  @ApiProperty({ description: '厂房编号', example: 'WS-001' })
  @IsString()
  code: string;

  @ApiProperty({ description: '厂房名称', example: '一号厂房' })
  @IsString()
  name: string;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '地址', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

