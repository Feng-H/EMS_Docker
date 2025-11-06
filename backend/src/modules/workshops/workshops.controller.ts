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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('厂房管理')
@Controller('workshops')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @ApiOperation({ summary: '创建厂房' })
  create(@Body() createWorkshopDto: CreateWorkshopDto) {
    return this.workshopsService.create(createWorkshopDto);
  }

  @Get()
  @ApiOperation({ summary: '获取厂房列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.workshopsService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
    );
  }

  @Get('active')
  @ApiOperation({ summary: '获取启用的厂房列表' })
  findAllActive() {
    return this.workshopsService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取厂房详情' })
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新厂房' })
  update(@Param('id') id: string, @Body() updateWorkshopDto: UpdateWorkshopDto) {
    return this.workshopsService.update(+id, updateWorkshopDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除厂房' })
  remove(@Param('id') id: string) {
    return this.workshopsService.remove(+id);
  }
}

