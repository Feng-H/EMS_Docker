import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, IsArray, IsIn } from 'class-validator';

export class CreateSparePartDto {
  @ApiProperty({ description: '备件编号' })
  @IsString()
  partNo: string;

  @ApiProperty({ description: '备件名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '规格参数', required: false })
  @IsObject()
  @IsOptional()
  spec?: Record<string, any>;

  @ApiProperty({ description: '供应商', required: false })
  @IsString()
  @IsOptional()
  supplier?: string;

  @ApiProperty({ description: '品牌', required: false })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ description: '库存数量', required: false })
  @IsNumber()
  @IsOptional()
  stockQty?: number;

  @ApiProperty({ description: '最低库存', required: false })
  @IsNumber()
  @IsOptional()
  minStock?: number;

  @ApiProperty({ description: '单位', required: false, enum: ['pc', 'set', 'm'], default: 'pc' })
  @IsString()
  @IsIn(['pc', 'set', 'm'])
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: '存储位置', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: '图片URL列表', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];
}

