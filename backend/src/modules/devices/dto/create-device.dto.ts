import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsObject, IsArray } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ description: '设备编号', example: 'EQ-001' })
  @IsString()
  assetNo: string;

  @ApiProperty({ description: '设备名称', example: '数控机床' })
  @IsString()
  name: string;

  @ApiProperty({ description: '型号', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ description: '品牌', required: false })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ description: '厂房ID', required: false })
  @IsOptional()
  workshopId?: number;

  @ApiProperty({ description: '位置（文本）', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: '状态', example: 'in_use', enum: ['in_use', 'trial_run', 'debugging', 'sealed', 'scrapped'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: '采购日期', required: false })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiProperty({ description: '保修到期日', required: false })
  @IsDateString()
  @IsOptional()
  warrantyUntil?: string;

  @ApiProperty({ description: '规格参数', required: false, type: Object })
  @IsObject()
  @IsOptional()
  spec?: Record<string, any>;

  @ApiProperty({ description: '图片URL列表', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];
}

