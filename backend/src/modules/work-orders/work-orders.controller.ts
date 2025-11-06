import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UseSparePartsDto } from './dto/use-spare-parts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('工单管理')
@Controller('work-orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @ApiOperation({ summary: '创建工单' })
  create(@Body() createDto: CreateWorkOrderDto, @Request() req) {
    return this.workOrdersService.create(createDto, req.user.userId);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取工单统计信息' })
  getStatistics() {
    return this.workOrdersService.getStatistics();
  }

  @Get('export')
  @ApiOperation({ summary: '导出工单列表（Excel）' })
  async export(@Res() res: Response) {
    try {
      const buffer = await this.workOrdersService.exportToExcel();
      const filename = `工单列表_${new Date().toISOString().split('T')[0]}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
      res.send(buffer);
    } catch (error: any) {
      console.error('导出工单列表错误:', error);
      res.status(500).json({
        message: error.message || '导出失败',
        statusCode: 500,
      });
    }
  }

  @Get()
  @ApiOperation({ summary: '获取工单列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string, @Query('priority') priority?: string, @Query('search') search?: string) {
    return this.workOrdersService.findAll(page ? Number(page) : 1, limit ? Number(limit) : 10, status, priority, search);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工单详情' })
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工单' })
  update(@Param('id') id: string, @Body() updateDto: Partial<CreateWorkOrderDto>) {
    return this.workOrdersService.update(+id, updateDto);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: '分配工单' })
  assign(@Param('id') id: string, @Body() body: { userId: number }) {
    return this.workOrdersService.assign(+id, body.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工单' })
  remove(@Param('id') id: string) {
    return this.workOrdersService.remove(+id);
  }

  @Post(':id/use-spare-parts')
  @ApiOperation({ summary: '使用备件（领用备件并创建旧件记录）' })
  useSpareParts(@Param('id') id: string, @Body() useSparePartsDto: UseSparePartsDto, @Request() req) {
    return this.workOrdersService.useSpareParts(+id, useSparePartsDto, req.user.userId);
  }

  @Get(':id/parts')
  @ApiOperation({ summary: '获取工单使用的备件列表' })
  getWorkOrderParts(@Param('id') id: string) {
    return this.workOrdersService.getWorkOrderParts(+id);
  }
}
