import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateWorkOrderDto {
  @ApiProperty({ description: '设备ID', required: false })
  @IsNumber()
  @IsOptional()
  deviceId?: number;

  @ApiProperty({ description: '工单标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '优先级', enum: ['low', 'normal', 'high', 'urgent'], required: false })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ description: '故障分类', required: false })
  @IsString()
  @IsOptional()
  faultCategory?: string;

  @ApiProperty({ description: '附件列表', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}

