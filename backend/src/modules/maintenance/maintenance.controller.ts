import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { SubmitMaintenanceTaskDto } from './dto/submit-maintenance-task.dto';
import { ReviewMaintenanceTaskDto } from './dto/review-maintenance-task.dto';
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('保养管理')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('plans')
  @ApiOperation({ summary: '创建保养计划' })
  createPlan(@Body() createDto: CreateMaintenancePlanDto, @Request() req) {
    return this.maintenanceService.createPlan(createDto, req.user.userId);
  }

  @Get('plans')
  @ApiOperation({ summary: '获取保养计划列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAllPlans(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.maintenanceService.findAllPlans(page ? Number(page) : 1, limit ? Number(limit) : 10, search);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: '获取保养计划详情' })
  findPlanById(@Param('id') id: string) {
    return this.maintenanceService.findPlanById(+id);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: '更新保养计划' })
  updatePlan(@Param('id') id: string, @Body() updateDto: Partial<CreateMaintenancePlanDto>) {
    return this.maintenanceService.updatePlan(+id, updateDto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: '删除保养计划' })
  deletePlan(@Param('id') id: string) {
    return this.maintenanceService.deletePlan(+id);
  }

  @Get('tasks')
  @ApiOperation({ summary: '获取保养任务列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getTasks(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string, @Query('search') search?: string) {
    return this.maintenanceService.getTasks(page ? Number(page) : 1, limit ? Number(limit) : 10, status, search);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '获取保养任务详情' })
  findTaskById(@Param('id') id: string) {
    return this.maintenanceService.findTaskById(+id);
  }

  @Post('tasks/:id/submit')
  @ApiOperation({ summary: '提交保养任务执行结果' })
  submitTask(@Param('id') id: string, @Body() submitDto: SubmitMaintenanceTaskDto, @Request() req) {
    return this.maintenanceService.submitTask(+id, submitDto, req.user.userId);
  }

  @Post('tasks/:id/review')
  @ApiOperation({ summary: '保养任务验收' })
  reviewTask(@Param('id') id: string, @Body() reviewDto: ReviewMaintenanceTaskDto, @Request() req) {
    return this.maintenanceService.reviewTask(+id, reviewDto, req.user.userId);
  }

  @Post('plans/:id/bind-devices')
  @ApiOperation({ summary: '绑定设备到保养计划' })
  bindDevices(@Param('id') id: string, @Body() body: { deviceIds: number[] }) {
    return this.maintenanceService.bindDevices(+id, body.deviceIds);
  }

  @Get('plans/:id/devices')
  @ApiOperation({ summary: '获取保养计划绑定的设备列表' })
  getPlanDevices(@Param('id') id: string) {
    return this.maintenanceService.getPlanDevices(+id);
  }

  @Delete('plans/:id/devices/:deviceId')
  @ApiOperation({ summary: '解绑设备' })
  async unbindDevice(@Param('id') planId: string, @Param('deviceId') deviceId: string) {
    await this.maintenanceService.unbindDevice(+planId, +deviceId);
    return { message: '解绑成功' };
  }

  @Post('plans/:id/generate-tasks')
  @ApiOperation({ summary: '为保养计划生成任务' })
  generateTasks(@Param('id') id: string, @Body() generateDto?: GenerateTasksDto) {
    const scheduledAt = generateDto?.scheduledAt ? new Date(generateDto.scheduledAt) : undefined;
    return this.maintenanceService.generateTasks(+id, scheduledAt, generateDto?.deviceIds);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取保养统计信息' })
  getStatistics() {
    return this.maintenanceService.getStatistics();
  }
}
