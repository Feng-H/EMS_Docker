import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportDeviceDto } from './dto/import-device.dto';

@ApiTags('设备管理')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: '创建设备' })
  create(@Body() createDeviceDto: CreateDeviceDto, @Request() req) {
    return this.devicesService.create(createDeviceDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: '获取设备列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.devicesService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
      status,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取设备统计信息' })
  getStatistics() {
    return this.devicesService.getStatistics();
  }

  @Get('export')
  @ApiOperation({ summary: '导出设备列表（Excel）' })
  async export(@Res() res: Response) {
    try {
      const buffer = await this.devicesService.exportToExcel();
      const filename = `设备列表_${new Date().toISOString().split('T')[0]}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
      res.send(buffer);
    } catch (error: any) {
      console.error('导出设备列表错误:', error);
      res.status(500).json({
        message: error.message || '导出失败',
        statusCode: 500,
      });
    }
  }

  @Get('template')
  @ApiOperation({ summary: '下载导入模板（Excel）' })
  async downloadTemplate(@Res() res: Response) {
    try {
      const buffer = await this.devicesService.downloadTemplate();
      const filename = encodeURIComponent('设备导入模板.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      res.send(buffer);
    } catch (error: any) {
      console.error('模板下载错误:', error);
      res.status(500).json({
        message: error.message || '生成模板失败',
        statusCode: 500,
      });
    }
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '批量导入设备（Excel）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async import(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.devicesService.importFromExcel(file, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设备详情' })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新设备' })
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(+id, updateDeviceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备' })
  remove(@Param('id') id: string) {
    return this.devicesService.remove(+id);
  }
}
