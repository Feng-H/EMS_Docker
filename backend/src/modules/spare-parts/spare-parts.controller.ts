import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SparePartsService } from './spare-parts.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('备件管理')
@Controller('spare-parts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Post()
  @ApiOperation({ summary: '创建备件' })
  create(@Body() createDto: CreateSparePartDto) {
    return this.sparePartsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取备件列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.sparePartsService.findAll(page ? Number(page) : 1, limit ? Number(limit) : 10, search);
  }

  @Get('low-stock')
  @ApiOperation({ summary: '获取低库存备件' })
  getLowStock() {
    return this.sparePartsService.getLowStock();
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取备件统计信息' })
  getStatistics() {
    return this.sparePartsService.getStatistics();
  }

  @Get('old-parts')
  @ApiOperation({ summary: '获取旧件台账列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  getOldParts(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.sparePartsService.getOldParts(page ? Number(page) : 1, limit ? Number(limit) : 10, search);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取备件详情' })
  findOne(@Param('id') id: string) {
    return this.sparePartsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新备件' })
  update(@Param('id') id: string, @Body() updateDto: Partial<CreateSparePartDto>) {
    return this.sparePartsService.update(+id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除备件' })
  remove(@Param('id') id: string) {
    return this.sparePartsService.remove(+id);
  }
}

