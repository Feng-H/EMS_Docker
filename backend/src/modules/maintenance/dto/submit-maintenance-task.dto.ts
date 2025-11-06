import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsNumber } from 'class-validator';

export class MaintenanceItemResultDto {
  @ApiProperty({ description: '类型', enum: ['qualitative', 'quantitative'] })
  type: 'qualitative' | 'quantitative';

  @ApiProperty({ description: '值（定性为字符串，定量为数字）' })
  value: string | number;

  @ApiProperty({ description: '状态', enum: ['normal', 'abnormal'] })
  status: 'normal' | 'abnormal';
}

export class SubmitMaintenanceTaskDto {
  @ApiProperty({
    description: '执行结果，key为itemId',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['qualitative', 'quantitative'] },
        value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        status: { type: 'string', enum: ['normal', 'abnormal'] },
      },
    },
  })
  @IsObject()
  results: Record<string, MaintenanceItemResultDto>;

  @ApiProperty({ description: '备注', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: '附件URL列表', required: false, type: [String] })
  @IsOptional()
  attachments?: string[];
}

