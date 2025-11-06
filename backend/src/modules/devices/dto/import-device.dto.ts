import { ApiProperty } from '@nestjs/swagger';

export class ImportDeviceDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

