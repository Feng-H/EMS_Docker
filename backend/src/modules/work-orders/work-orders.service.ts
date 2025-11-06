import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { WorkOrder } from './entities/work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { OldPart } from './entities/old-part.entity';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UseSparePartsDto } from './dto/use-spare-parts.dto';
import { SparePartsService } from '../spare-parts/spare-parts.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder)
    private workOrdersRepository: Repository<WorkOrder>,
    @InjectRepository(WorkOrderPart)
    private workOrderPartRepository: Repository<WorkOrderPart>,
    @InjectRepository(OldPart)
    private oldPartRepository: Repository<OldPart>,
    private sparePartsService: SparePartsService,
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateWorkOrderDto, userId: number): Promise<WorkOrder> {
    const orderNo = `WO-${Date.now()}`;
    const order = this.workOrdersRepository.create({
      ...createDto,
      orderNo,
      reporterId: userId,
      reportedAt: new Date(), // 记录报修时间
    });
    return this.workOrdersRepository.save(order);
  }

  async findAll(page = 1, limit = 10, status?: string, priority?: string, search?: string): Promise<{ data: WorkOrder[]; total: number }> {
    const query = this.workOrdersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.device', 'device')
      .leftJoinAndSelect('order.reporter', 'reporter')
      .leftJoinAndSelect('order.assignee', 'assignee');

    if (status) {
      query.where('order.status = :status', { status });
    }

    if (priority) {
      const whereCondition = status ? 'order.priority = :priority' : 'order.priority = :priority';
      if (status) {
        query.andWhere(whereCondition, { priority });
      } else {
        query.where(whereCondition, { priority });
      }
    }

    if (search) {
      const searchCondition = '(device.name LIKE :search OR device.asset_no LIKE :search OR order.title LIKE :search)';
      if (status || priority) {
        query.andWhere(searchCondition, { search: `%${search}%` });
      } else {
        query.where(searchCondition, { search: `%${search}%` });
      }
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('order.created_at', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number): Promise<WorkOrder> {
    const order = await this.workOrdersRepository.findOne({
      where: { id },
      relations: ['device', 'reporter', 'assignee'],
    });

    if (!order) {
      throw new NotFoundException(`工单 ID ${id} 不存在`);
    }

    return order;
  }

  async findOneWithParts(id: number): Promise<WorkOrder> {
    const order = await this.findOne(id);
    const parts = await this.getWorkOrderParts(id);
    (order as any).usedParts = parts;
    return order;
  }

  async update(id: number, updateDto: Partial<CreateWorkOrderDto & { status?: string; faultCause?: string; solution?: string; assignedTo?: number }>): Promise<WorkOrder> {
    const order = await this.findOne(id);
    
    // 状态流转逻辑
    if (updateDto.status) {
      const statusFlow: Record<string, string[]> = {
        created: ['assigned', 'in_progress'], // 允许从 created 直接到 in_progress
        assigned: ['accepted', 'in_progress'],
        accepted: ['in_progress'],
        in_progress: ['pending_acceptance'],
        pending_acceptance: ['completed', 'closed', 'in_progress'], // 允许驳回回到执行中
        completed: ['closed'],
      };
      
      const allowedStatuses = statusFlow[order.status] || [];
      if (allowedStatuses.includes(updateDto.status)) {
        // 如果要从执行中变为待验收，必须填写故障原因和解决方案
        if (updateDto.status === 'pending_acceptance' && order.status === 'in_progress') {
          const finalFaultCause = updateDto.faultCause !== undefined ? updateDto.faultCause : order.faultCause;
          const finalSolution = updateDto.solution !== undefined ? updateDto.solution : order.solution;
          
          if (!finalFaultCause || !finalFaultCause.trim()) {
            throw new BadRequestException('完成维修前必须填写故障原因');
          }
          if (!finalSolution || !finalSolution.trim()) {
            throw new BadRequestException('完成维修前必须填写解决方案');
          }
        }
        
        order.status = updateDto.status;
        if (updateDto.status === 'in_progress' && !order.startedAt) {
          order.startedAt = new Date();
          // 计算响应时间（分钟）：维修开始时间 - 报修时间
          if (order.reportedAt) {
            const responseTimeMs = order.startedAt.getTime() - order.reportedAt.getTime();
            order.responseTime = Math.round(responseTimeMs / (1000 * 60)); // 转换为分钟
          }
        }
        if (updateDto.status === 'pending_acceptance' && !order.finishedAt) {
          order.finishedAt = new Date();
          // 计算维修时间（分钟）：维修完成时间 - 维修开始时间
          if (order.startedAt) {
            const repairTimeMs = order.finishedAt.getTime() - order.startedAt.getTime();
            order.repairTime = Math.round(repairTimeMs / (1000 * 60)); // 转换为分钟
          }
        }
        if (updateDto.status === 'completed' && !order.finishedAt) {
          order.finishedAt = new Date();
          // 如果之前没有计算维修时间，现在计算
          if (order.startedAt && !order.repairTime) {
            const repairTimeMs = order.finishedAt.getTime() - order.startedAt.getTime();
            order.repairTime = Math.round(repairTimeMs / (1000 * 60)); // 转换为分钟
          }
        }
        if (updateDto.status === 'accepted' && !order.acceptedAt) {
          order.acceptedAt = new Date();
        }
        // 如果从 created 直接到 in_progress，且没有分配负责人，则使用传入的 assignedTo
        if (updateDto.status === 'in_progress' && !order.assignedTo && updateDto.assignedTo) {
          order.assignedTo = updateDto.assignedTo;
        }
        // 如果从待验收驳回回到执行中，清空故障原因和解决方案
        if (updateDto.status === 'in_progress' && order.status === 'pending_acceptance') {
          order.faultCause = null;
          order.solution = null;
          // 不清空 finishedAt，保留维修完成时间记录
        }
      }
    }
    
    Object.assign(order, updateDto);
    return this.workOrdersRepository.save(order);
  }

  async assign(id: number, userId: number): Promise<WorkOrder> {
    const order = await this.findOne(id);
    order.assignedTo = userId;
    order.status = 'assigned';
    return this.workOrdersRepository.save(order);
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);
    await this.workOrdersRepository.remove(order);
  }

  async exportToExcel(): Promise<Buffer> {
    const orders = await this.workOrdersRepository.find({
      relations: ['device', 'reporter', 'assignee'],
      order: { created_at: 'DESC' },
    });

    // 状态映射
    const statusMap: Record<string, string> = {
      'created': '待报修',
      'assigned': '待执行',
      'accepted': '已接受',
      'in_progress': '执行中',
      'pending_acceptance': '待验收',
      'completed': '已完成',
      'closed': '已关闭',
    };

    // 优先级映射
    const priorityMap: Record<string, string> = {
      'low': '低',
      'normal': '普通',
      'high': '高',
      'urgent': '紧急',
    };

    // 格式化日期时间
    const formatDateTime = (date: Date | string | null | undefined): string => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    // 格式化时间（分钟）
    const formatTime = (minutes: number | null | undefined): string => {
      if (minutes === null || minutes === undefined) return '';
      if (minutes < 60) {
        return `${minutes} 分钟`;
      } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
      } else {
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;
        let result = `${days} 天`;
        if (hours > 0) result += ` ${hours} 小时`;
        if (mins > 0) result += ` ${mins} 分钟`;
        return result;
      }
    };

    const data = orders.map(order => ({
      '工单号': order.orderNo,
      '标题': order.title,
      '设备编号': order.device?.assetNo || '',
      '设备名称': order.device?.name || '',
      '报修人': order.reporter?.name || '',
      '负责人': order.assignee?.name || '',
      '优先级': priorityMap[order.priority] || order.priority,
      '状态': statusMap[order.status] || order.status,
      '故障分类': order.faultCategory || '',
      '故障描述': order.description || '',
      '故障原因': order.faultCause || '',
      '解决方案': order.solution || '',
      '报修时间': formatDateTime(order.reportedAt),
      '维修开始时间': formatDateTime(order.startedAt),
      '维修完成时间': formatDateTime(order.finishedAt),
      '响应时间': formatTime(order.responseTime),
      '维修时间': formatTime(order.repairTime),
      '创建时间': formatDateTime(order.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '工单列表');
    
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * 使用备件（领用备件并创建旧件记录）
   */
  async useSpareParts(orderId: number, useSparePartsDto: UseSparePartsDto, userId: number): Promise<void> {
    const order = await this.findOne(orderId);
    
    if (order.status !== 'in_progress') {
      throw new BadRequestException('只能在执行中的工单中使用备件');
    }

    if (!useSparePartsDto.spareParts || useSparePartsDto.spareParts.length === 0) {
      return; // 如果没有备件，直接返回
    }

    // 重新加载工单以获取设备信息
    const orderWithDevice = await this.workOrdersRepository.findOne({
      where: { id: orderId },
      relations: ['device'],
    });
    if (!orderWithDevice) {
      throw new NotFoundException('工单不存在');
    }
    
    // 使用事务确保数据一致性
    await this.dataSource.transaction(async (manager) => {
      for (const usage of useSparePartsDto.spareParts) {
        // 检查备件是否存在
        const part = await this.sparePartsService.findOne(usage.partId);
        
        // 验证数量：pc 和 set 单位必须是整数
        const unit = part.unit || '';
        if ((unit === 'pc' || unit === 'set') && usage.qty % 1 !== 0) {
          throw new BadRequestException(`备件 ${part.name} 的单位是 ${unit}，数量必须是整数`);
        }
        
        // 检查库存是否充足
        if (Number(part.stockQty) < Number(usage.qty)) {
          throw new BadRequestException(`备件 ${part.name} 库存不足，当前库存：${part.stockQty}，需要：${usage.qty}`);
        }

        // 扣除备件库存
        part.stockQty = Number(part.stockQty) - Number(usage.qty);
        await manager.save(part);

        // 创建工单备件关联记录
        const workOrderPart = manager.create(WorkOrderPart, {
          workOrderId: orderId,
          partId: usage.partId,
          qty: usage.qty,
        });
        await manager.save(workOrderPart);

        // 创建旧件记录（备件编号加J后缀）
        // 如果备件编号已经以J结尾，则不再添加
        const oldPartNo = part.partNo.endsWith('J') ? part.partNo : `${part.partNo}J`;
        console.log(`[旧件创建] 备件编号: ${part.partNo}, 旧件编号: ${oldPartNo}`);
        const oldPart = manager.create(OldPart, {
          workOrderId: orderId,
          deviceId: orderWithDevice.deviceId,
          partNo: oldPartNo, // 在原有编号后加上J（如果还没有J后缀）
          qty: usage.qty, // 记录数量
          name: part.name,
          spec: part.spec,
          supplier: part.supplier,
          unit: part.unit,
          location: part.location,
          notes: `来自工单 ${orderWithDevice.orderNo}，设备 ${orderWithDevice.device?.name || '未知设备'}`,
        });
        await manager.save(oldPart);
      }
    });
  }

  /**
   * 获取工单使用的备件列表
   */
  async getWorkOrderParts(orderId: number): Promise<WorkOrderPart[]> {
    return this.workOrderPartRepository.find({
      where: { workOrderId: orderId },
      relations: ['part'],
    });
  }

  async getStatistics() {
    const [total, created, assigned, accepted, inProgress, pendingAcceptance, completed, closed] = await Promise.all([
      this.workOrdersRepository.count(),
      this.workOrdersRepository.count({ where: { status: 'created' } }),
      this.workOrdersRepository.count({ where: { status: 'assigned' } }),
      this.workOrdersRepository.count({ where: { status: 'accepted' } }),
      this.workOrdersRepository.count({ where: { status: 'in_progress' } }),
      this.workOrdersRepository.count({ where: { status: 'pending_acceptance' } }),
      this.workOrdersRepository.count({ where: { status: 'completed' } }),
      this.workOrdersRepository.count({ where: { status: 'closed' } }),
    ]);

    return {
      total,
      created,
      assigned,
      accepted,
      inProgress,
      pendingAcceptance,
      completed,
      closed,
    };
  }
}
