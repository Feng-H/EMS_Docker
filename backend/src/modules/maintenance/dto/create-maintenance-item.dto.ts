import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QualitativeOptionsDto {
  @ApiProperty({ description: '正常选项文本', default: '正常' })
  @IsString()
  normal: string;

  @ApiProperty({ description: '异常选项文本', default: '异常' })
  @IsString()
  abnormal: string;
}

export class QuantitativeSettingsDto {
  @ApiProperty({ description: '单位', example: '℃' })
  @IsString()
  unit: string;

  @ApiProperty({ description: '最小值（下限）', required: false })
  @IsNumber()
  @IsOptional()
  minValue?: number;

  @ApiProperty({ description: '最大值（上限）', required: false })
  @IsNumber()
  @IsOptional()
  maxValue?: number;
}

export class CreateMaintenanceItemDto {
  @ApiProperty({ description: '保养内容名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '类型', enum: ['qualitative', 'quantitative'] })
  @IsString()
  itemType: 'qualitative' | 'quantitative';

  @ApiProperty({ description: '定性选项', required: false, type: QualitativeOptionsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => QualitativeOptionsDto)
  @IsOptional()
  qualitativeOptions?: QualitativeOptionsDto;

  @ApiProperty({ description: '定量设置', required: false, type: QuantitativeSettingsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => QuantitativeSettingsDto)
  @IsOptional()
  quantitativeSettings?: QuantitativeSettingsDto;

  @ApiProperty({ description: '排序顺序', required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ description: '描述说明', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

