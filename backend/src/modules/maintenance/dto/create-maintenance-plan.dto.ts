import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMaintenanceItemDto } from './create-maintenance-item.dto';

export class CreateMaintenancePlanDto {
  @ApiProperty({ description: '设备ID列表（可选，可在创建后绑定）', required: false, type: [Number] })
  @IsNumber({}, { each: true })
  @IsOptional()
  deviceIds?: number[];

  @ApiProperty({ description: '保养计划标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '频率类型', enum: ['shift', 'daily', 'weekly', 'monthly', 'yearly'] })
  @IsString()
  frequencyType: string;

  @ApiProperty({ description: '频率值', example: 1 })
  @IsNumber()
  frequencyValue: number;

  @ApiProperty({ description: '下次到期时间', required: false })
  @IsDateString()
  @IsOptional()
  nextDueAt?: string;

  @ApiProperty({ description: '分配班组ID', required: false })
  @IsNumber()
  @IsOptional()
  assignedGroupId?: number;

  @ApiProperty({ description: '分配给用户ID', required: false })
  @IsNumber()
  @IsOptional()
  assignedTo?: number;

  @ApiProperty({ description: '是否激活', required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({ description: '保养内容项列表', type: [CreateMaintenanceItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceItemDto)
  @IsOptional()
  items?: CreateMaintenanceItemDto[];
}

