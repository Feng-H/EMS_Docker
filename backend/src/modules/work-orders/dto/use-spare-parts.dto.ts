import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SparePartUsageDto {
  @ApiProperty({ description: '备件ID' })
  @IsNumber()
  partId: number;

  @ApiProperty({ description: '使用数量' })
  @IsNumber()
  @IsPositive()
  qty: number;
}

export class UseSparePartsDto {
  @ApiProperty({ description: '备件使用列表', type: [SparePartUsageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SparePartUsageDto)
  spareParts: SparePartUsageDto[];
}

