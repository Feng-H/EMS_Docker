import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MaintenancePlan } from './entities/maintenance-plan.entity';
import { MaintenanceTask } from './entities/maintenance-task.entity';
import { MaintenanceItem } from './entities/maintenance-item.entity';
import { MaintenancePlanDevice } from './entities/maintenance-plan-device.entity';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { SubmitMaintenanceTaskDto } from './dto/submit-maintenance-task.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { Device } from '../devices/entities/device.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenancePlan)
    private plansRepository: Repository<MaintenancePlan>,
    @InjectRepository(MaintenanceTask)
    private tasksRepository: Repository<MaintenanceTask>,
    @InjectRepository(MaintenanceItem)
    private itemsRepository: Repository<MaintenanceItem>,
    @InjectRepository(MaintenancePlanDevice)
    private planDevicesRepository: Repository<MaintenancePlanDevice>,
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private workOrdersService: WorkOrdersService,
  ) {}

  async createPlan(createDto: CreateMaintenancePlanDto, userId: number): Promise<MaintenancePlan> {
    // 验证保养内容项数量
    if (createDto.items && createDto.items.length > 30) {
      throw new BadRequestException('保养内容项最多30项');
    }
    if (createDto.items && createDto.items.length < 1) {
      throw new BadRequestException('保养内容项至少1项');
    }

    const { items, deviceIds, ...planData } = createDto;
    const plan = this.plansRepository.create({
      ...planData,
      createdBy: userId,
    });
    const savedPlan = await this.plansRepository.save(plan);

    // 保存保养内容项
    if (items && items.length > 0) {
      const maintenanceItems = items.map((item, index) =>
        this.itemsRepository.create({
          ...item,
          planId: savedPlan.id,
          sortOrder: item.sortOrder ?? index,
        })
      );
      await this.itemsRepository.save(maintenanceItems);
    }

    // 绑定设备（如果提供了设备ID列表）
    if (deviceIds && deviceIds.length > 0) {
      await this.bindDevices(savedPlan.id, deviceIds);
    }

    return this.findPlanById(savedPlan.id);
  }

  async findAllPlans(page = 1, limit = 10, search?: string): Promise<{ data: MaintenancePlan[]; total: number }> {
    const query = this.plansRepository.createQueryBuilder('plan')
      .leftJoinAndSelect('plan.assignee', 'assignee')
      .leftJoinAndSelect('plan.creator', 'creator')
      .leftJoinAndSelect('plan.items', 'items')
      .leftJoinAndSelect('plan.planDevices', 'planDevices')
      .leftJoinAndSelect('planDevices.device', 'device');

    if (search) {
      query.where(
        '(plan.title LIKE :search OR device.name LIKE :search OR device.asset_no LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('plan.created_at', 'DESC')
      .addOrderBy('items.sortOrder', 'ASC')
      .getManyAndCount();

    // 将 planDevices 转换为 devices 数组
    data.forEach(plan => {
      plan.devices = plan.planDevices?.map(pd => pd.device).filter(Boolean) || [];
    });

    return { data, total };
  }

  async findPlanById(id: number): Promise<MaintenancePlan> {
    const plan = await this.plansRepository.findOne({
      where: { id },
      relations: ['assignee', 'creator', 'tasks', 'items', 'planDevices', 'planDevices.device'],
    });

    if (!plan) {
      throw new NotFoundException(`保养计划 ID ${id} 不存在`);
    }

    // 按排序顺序排列保养内容项
    if (plan.items) {
      plan.items.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // 将 planDevices 转换为 devices 数组
    plan.devices = plan.planDevices?.map(pd => pd.device).filter(Boolean) || [];

    return plan;
  }

  async updatePlan(id: number, updateDto: Partial<CreateMaintenancePlanDto>): Promise<MaintenancePlan> {
    const plan = await this.findPlanById(id);
    const { items, deviceIds, ...planData } = updateDto;

    // 更新计划基本信息
    Object.assign(plan, planData);
    await this.plansRepository.save(plan);

    // 更新保养内容项
    if (items !== undefined) {
      // 验证数量
      if (items.length > 30) {
        throw new BadRequestException('保养内容项最多30项');
      }
      if (items.length < 1) {
        throw new BadRequestException('保养内容项至少1项');
      }

      // 删除旧的内容项
      await this.itemsRepository.delete({ planId: id });

      // 创建新的内容项
      if (items.length > 0) {
        const maintenanceItems = items.map((item, index) =>
          this.itemsRepository.create({
            ...item,
            planId: id,
            sortOrder: item.sortOrder ?? index,
          })
        );
        await this.itemsRepository.save(maintenanceItems);
      }
    }

    // 更新设备绑定（如果提供了设备ID列表）
    if (deviceIds !== undefined) {
      await this.updatePlanDevices(id, deviceIds);
    }

    return this.findPlanById(id);
  }

  async bindDevices(planId: number, deviceIds: number[]): Promise<void> {
    const plan = await this.findPlanById(planId);
    
    // 验证设备是否存在
    const devices = await this.devicesRepository.find({
      where: { id: In(deviceIds) },
    });

    if (devices.length !== deviceIds.length) {
      throw new BadRequestException('部分设备不存在');
    }

    // 删除旧的绑定
    await this.planDevicesRepository.delete({ planId });

    // 创建新的绑定
    const planDevices = deviceIds.map(deviceId =>
      this.planDevicesRepository.create({
        planId,
        deviceId,
      })
    );

    await this.planDevicesRepository.save(planDevices);
  }

  async updatePlanDevices(planId: number, deviceIds: number[]): Promise<void> {
    await this.bindDevices(planId, deviceIds);
  }

  async getPlanDevices(planId: number): Promise<Device[]> {
    const plan = await this.plansRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`保养计划 ID ${planId} 不存在`);
    }

    const planDevices = await this.planDevicesRepository.find({
      where: { planId },
      relations: ['device'],
    });

    return planDevices.map(pd => pd.device).filter(Boolean);
  }

  async unbindDevice(planId: number, deviceId: number): Promise<void> {
    await this.planDevicesRepository.delete({
      planId,
      deviceId,
    });
  }

  /**
   * 计算下次到期时间
   */
  private calculateNextDueDate(frequencyType: string, frequencyValue: number, fromDate?: Date): Date {
    const baseDate = fromDate || new Date();
    const nextDate = new Date(baseDate);

    switch (frequencyType) {
      case 'shift':
        // 班次：假设每班8小时，按天计算
        nextDate.setDate(nextDate.getDate() + frequencyValue);
        break;
      case 'daily':
        nextDate.setDate(nextDate.getDate() + frequencyValue);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + frequencyValue * 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + frequencyValue);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + frequencyValue);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + frequencyValue);
    }

    return nextDate;
  }

  /**
   * 为保养计划生成任务
   */
  async generateTasks(planId: number, scheduledAt?: Date, deviceIds?: number[]): Promise<MaintenanceTask[]> {
    const plan = await this.findPlanById(planId);

    if (!plan.active) {
      throw new BadRequestException('保养计划未激活，无法生成任务');
    }

    if (!plan.items || plan.items.length === 0) {
      throw new BadRequestException('保养计划没有保养内容项，无法生成任务');
    }

    // 获取要生成任务的设备列表
    let targetDevices: Device[];
    if (deviceIds && deviceIds.length > 0) {
      // 验证设备是否已绑定到该计划
      const planDevices = await this.planDevicesRepository.find({
        where: { planId, deviceId: In(deviceIds) },
        relations: ['device'],
      });
      if (planDevices.length !== deviceIds.length) {
        throw new BadRequestException('部分设备未绑定到该保养计划');
      }
      targetDevices = planDevices.map(pd => pd.device).filter(Boolean);
    } else {
      // 为所有绑定的设备生成任务
      targetDevices = await this.getPlanDevices(planId);
      if (targetDevices.length === 0) {
        throw new BadRequestException('保养计划未绑定设备，无法生成任务');
      }
    }

    // 计算计划执行时间
    const taskScheduledAt = scheduledAt || plan.nextDueAt || this.calculateNextDueDate(plan.frequencyType, plan.frequencyValue);

    // 为每个设备生成任务（手动生成时检查是否已有任务）
    const tasks: MaintenanceTask[] = [];
    const existingDevices: Array<{ assetNo: string; name: string }> = [];
    
    for (const device of targetDevices) {
      // 检查是否已存在相同计划时间的任务
      const existingTask = await this.tasksRepository.findOne({
        where: {
          planId: plan.id,
          deviceId: device.id,
          scheduledAt: taskScheduledAt,
        },
      });

      if (existingTask) {
        existingDevices.push({ assetNo: device.assetNo, name: device.name });
        continue; // 跳过已存在的任务
      }

      const task = this.tasksRepository.create({
        planId: plan.id,
        deviceId: device.id,
        scheduledAt: taskScheduledAt,
        assignedTo: plan.assignedTo,
        status: 'pending',
      });

      tasks.push(task);
    }

    // 如果有设备已有任务，抛出错误提示
    if (existingDevices.length > 0) {
      const deviceMessages = existingDevices.map(d => `${d.assetNo}（${d.name}）`).join('、');
      throw new BadRequestException(`${deviceMessages}已经有任务了，请在保养任务中执行`);
    }

    if (tasks.length === 0) {
      throw new BadRequestException('所有设备都已存在相同时间的任务');
    }

    const savedTasks = await this.tasksRepository.save(tasks);

    // 更新计划的下次到期时间
    if (!plan.nextDueAt || scheduledAt) {
      const nextDueAt = this.calculateNextDueDate(plan.frequencyType, plan.frequencyValue, taskScheduledAt);
      plan.nextDueAt = nextDueAt;
      await this.plansRepository.save(plan);
    }

    // 重新加载任务，包含完整的关系数据
    const taskIds = savedTasks.map(t => t.id);
    const fullTasks = await this.tasksRepository.find({
      where: { id: In(taskIds) },
      relations: ['device', 'plan', 'plan.items'],
    });

    // 按排序顺序排列保养内容项
    fullTasks.forEach(task => {
      if (task.plan && task.plan.items) {
        task.plan.items.sort((a, b) => a.sortOrder - b.sortOrder);
      }
    });

    return fullTasks;
  }

  /**
   * 自动生成任务（定时任务调用，不检查是否已有任务）
   */
  async generateTasksAuto(planId: number, scheduledAt?: Date): Promise<MaintenanceTask[]> {
    const plan = await this.findPlanById(planId);

    if (!plan.active) {
      return []; // 定时任务不抛出异常，直接返回空数组
    }

    if (!plan.items || plan.items.length === 0) {
      return [];
    }

    // 为所有绑定的设备生成任务
    const targetDevices = await this.getPlanDevices(planId);
    if (targetDevices.length === 0) {
      return [];
    }

    // 计算计划执行时间
    const taskScheduledAt = scheduledAt || plan.nextDueAt || this.calculateNextDueDate(plan.frequencyType, plan.frequencyValue);

    // 为每个设备生成任务（自动生成时不检查是否已有任务，直接跳过）
    const tasks: MaintenanceTask[] = [];
    for (const device of targetDevices) {
      // 检查是否已存在相同计划时间的任务
      const existingTask = await this.tasksRepository.findOne({
        where: {
          planId: plan.id,
          deviceId: device.id,
          scheduledAt: taskScheduledAt,
        },
      });

      if (existingTask) {
        continue; // 跳过已存在的任务
      }

      const task = this.tasksRepository.create({
        planId: plan.id,
        deviceId: device.id,
        scheduledAt: taskScheduledAt,
        assignedTo: plan.assignedTo,
        status: 'pending',
      });

      tasks.push(task);
    }

    if (tasks.length === 0) {
      return []; // 定时任务不抛出异常
    }

    const savedTasks = await this.tasksRepository.save(tasks);

    // 更新计划的下次到期时间
    if (!plan.nextDueAt || scheduledAt) {
      const nextDueAt = this.calculateNextDueDate(plan.frequencyType, plan.frequencyValue, taskScheduledAt);
      plan.nextDueAt = nextDueAt;
      await this.plansRepository.save(plan);
    }

    // 重新加载任务，包含完整的关系数据
    const taskIds = savedTasks.map(t => t.id);
    const fullTasks = await this.tasksRepository.find({
      where: { id: In(taskIds) },
      relations: ['device', 'plan', 'plan.items'],
    });

    // 按排序顺序排列保养内容项
    fullTasks.forEach(task => {
      if (task.plan && task.plan.items) {
        task.plan.items.sort((a, b) => a.sortOrder - b.sortOrder);
      }
    });

    return fullTasks;
  }

  /**
   * 获取指定频率类型的所有激活计划（用于定时任务）
   */
  async findAllPlansForScheduler(frequencyType: string): Promise<MaintenancePlan[]> {
    return this.plansRepository.find({
      where: {
        active: true,
        frequencyType: frequencyType,
      },
      relations: ['planDevices', 'planDevices.device'],
    });
  }

  async deletePlan(id: number): Promise<void> {
    const plan = await this.findPlanById(id);
    await this.plansRepository.remove(plan);
  }

  async getTasks(page = 1, limit = 10, status?: string, search?: string): Promise<{ data: MaintenanceTask[]; total: number }> {
    const query = this.tasksRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.device', 'device')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.plan', 'plan')
      .leftJoinAndSelect('plan.items', 'items');

    if (status) {
      query.where('task.status = :status', { status });
    }

    if (search) {
      const searchCondition = '(device.name LIKE :search OR device.asset_no LIKE :search OR plan.title LIKE :search)';
      if (status) {
        query.andWhere(searchCondition, { search: `%${search}%` });
      } else {
        query.where(searchCondition, { search: `%${search}%` });
      }
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('task.scheduledAt', 'DESC')
      .addOrderBy('items.sortOrder', 'ASC')
      .getManyAndCount();

    return { data, total };
  }

  async findTaskById(id: number): Promise<MaintenanceTask> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['device', 'assignee', 'plan', 'plan.items'],
    });

    if (!task) {
      throw new NotFoundException(`保养任务 ID ${id} 不存在`);
    }

    // 按排序顺序排列保养内容项
    if (task.plan && task.plan.items) {
      task.plan.items.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return task;
  }

  async submitTask(taskId: number, submitDto: SubmitMaintenanceTaskDto, userId: number): Promise<MaintenanceTask> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['plan', 'plan.items', 'device'],
    });

    if (!task) {
      throw new NotFoundException(`保养任务 ID ${taskId} 不存在`);
    }

    if (task.status === 'completed') {
      throw new BadRequestException('该任务已完成，无法再次提交');
    }

    // 验证所有保养内容项都有结果
    if (!task.plan || !task.plan.items || task.plan.items.length === 0) {
      throw new BadRequestException('该保养计划没有保养内容项');
    }

    const planItems = task.plan.items;
    const abnormalItems: Array<{ itemId: number; itemName: string; reason: string }> = [];

    // 验证每个保养内容项的结果
    for (const item of planItems) {
      const result = submitDto.results[item.id.toString()];
      if (!result) {
        throw new BadRequestException(`保养内容项"${item.name}"未填写结果`);
      }

      // 验证定量项的数值范围
      if (item.itemType === 'quantitative' && result.type === 'quantitative') {
        const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value as string);
        if (isNaN(numValue)) {
          throw new BadRequestException(`保养内容项"${item.name}"的数值格式不正确`);
        }

        const settings = item.quantitativeSettings;
        if (settings) {
          if (settings.minValue !== undefined && numValue < settings.minValue) {
            result.status = 'abnormal';
            abnormalItems.push({
              itemId: item.id,
              itemName: item.name,
              reason: `数值 ${numValue}${settings.unit} 低于下限 ${settings.minValue}${settings.unit}`,
            });
          } else if (settings.maxValue !== undefined && numValue > settings.maxValue) {
            result.status = 'abnormal';
            abnormalItems.push({
              itemId: item.id,
              itemName: item.name,
              reason: `数值 ${numValue}${settings.unit} 高于上限 ${settings.maxValue}${settings.unit}`,
            });
          }
        }
      }

      // 检查是否有异常
      if (result.status === 'abnormal') {
        abnormalItems.push({
          itemId: item.id,
          itemName: item.name,
          reason: result.type === 'qualitative' ? '选择异常' : abnormalItems.find(a => a.itemId === item.id)?.reason || '数值异常',
        });
      }
    }

    // 更新任务状态和结果
    task.result = submitDto.results;
    task.hasAbnormal = abnormalItems.length > 0;
    task.status = 'completed';
    task.finishedAt = new Date();
    task.notes = submitDto.notes;
    if (submitDto.attachments) {
      task.attachments = submitDto.attachments;
    }

    // 如果有异常，自动生成工单
    if (abnormalItems.length > 0) {
      const abnormalDescription = abnormalItems
        .map(item => `- ${item.itemName}: ${item.reason}`)
        .join('\n');

      const workOrder = await this.workOrdersService.create(
        {
          deviceId: task.deviceId,
          title: `保养异常：${task.plan.title}`,
          description: `保养任务执行发现异常项：\n${abnormalDescription}\n\n保养任务ID: ${taskId}`,
          priority: 'high',
        },
        userId
      );

      task.abnormalWorkOrderId = workOrder.id;
    }

    return this.tasksRepository.save(task);
  }

  async getStatistics() {
    const [totalTasks, pendingTasks, inProgressTasks, completedTasks, overdueTasks, totalPlans, activePlans] = await Promise.all([
      this.tasksRepository.count(),
      this.tasksRepository.count({ where: { status: 'pending' } }),
      this.tasksRepository.count({ where: { status: 'in_progress' } }),
      this.tasksRepository.count({ where: { status: 'completed' } }),
      this.tasksRepository.count({ where: { status: 'overdue' } }),
      this.plansRepository.count(),
      this.plansRepository.count({ where: { active: true } }),
    ]);

    return {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      totalPlans,
      activePlans,
    };
  }
}
