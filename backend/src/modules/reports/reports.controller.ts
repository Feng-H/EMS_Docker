import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('报表统计')
@Controller('reports')
export class ReportsController {
  @Get()
  findAll() {
    return { message: '报表统计模块开发中...' };
  }
}
