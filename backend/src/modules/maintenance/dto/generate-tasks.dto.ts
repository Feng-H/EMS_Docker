import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsNumber } from 'class-validator';

export class GenerateTasksDto {
  @ApiProperty({ description: '计划执行时间（可选，不提供则根据计划周期计算）', required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({ description: '指定设备ID列表（可选，不提供则为所有绑定设备生成）', required: false, type: [Number] })
  @IsNumber({}, { each: true })
  @IsOptional()
  deviceIds?: number[];
}

