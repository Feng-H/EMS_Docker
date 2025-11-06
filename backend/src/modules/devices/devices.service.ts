import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { WorkshopsService } from '../workshops/workshops.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private workshopsService: WorkshopsService,
  ) {}

  async create(createDeviceDto: CreateDeviceDto, userId: number): Promise<Device> {
    // 清理数据，确保数字字段不是 NaN
    const deviceData: any = {
      assetNo: createDeviceDto.assetNo,
      name: createDeviceDto.name,
      createdBy: userId,
    };
    
    if (createDeviceDto.model) {
      deviceData.model = createDeviceDto.model;
    }
    if (createDeviceDto.brand) {
      deviceData.brand = createDeviceDto.brand;
    }
    if (createDeviceDto.status) {
      deviceData.status = createDeviceDto.status;
    }
    if (createDeviceDto.workshopId && !isNaN(Number(createDeviceDto.workshopId))) {
      deviceData.workshopId = Number(createDeviceDto.workshopId);
    }
    if (createDeviceDto.location) {
      deviceData.location = createDeviceDto.location;
    }
    if (createDeviceDto.purchaseDate) {
      deviceData.purchaseDate = new Date(createDeviceDto.purchaseDate);
    }
    if (createDeviceDto.warrantyUntil) {
      deviceData.warrantyUntil = new Date(createDeviceDto.warrantyUntil);
    }
    if (createDeviceDto.spec) {
      deviceData.spec = createDeviceDto.spec;
    }
    if (createDeviceDto.imageUrls) {
      deviceData.imageUrls = createDeviceDto.imageUrls;
    }
    
    const device = this.devicesRepository.create(deviceData);
    const result = await this.devicesRepository.save(device);
    // TypeORM save 可能返回数组，需要处理
    return Array.isArray(result) ? result[0] : result;
  }

  async findAll(page = 1, limit = 10, search?: string, status?: string): Promise<{ data: Device[]; total: number }> {
    const query = this.devicesRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.workshop', 'workshop')
      .leftJoinAndSelect('device.creator', 'creator');

    if (search) {
      query.where(
        '(device.name LIKE :search OR device.assetNo LIKE :search OR device.model LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      query.andWhere('device.status = :status', { status });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('device.created_at', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number): Promise<Device> {
    const device = await this.devicesRepository.findOne({
      where: { id },
      relations: ['workshop', 'creator', 'parts'],
    });

    if (!device) {
      throw new NotFoundException(`设备 ID ${id} 不存在`);
    }

    return device;
  }

  async update(id: number, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);
    
    // 清理更新数据，确保数字字段不是 NaN
    const updateData: any = {};
    
    if (updateDeviceDto.assetNo !== undefined) {
      updateData.assetNo = updateDeviceDto.assetNo;
    }
    if (updateDeviceDto.name !== undefined) {
      updateData.name = updateDeviceDto.name;
    }
    if (updateDeviceDto.model !== undefined) {
      updateData.model = updateDeviceDto.model || null;
    }
    if (updateDeviceDto.brand !== undefined) {
      updateData.brand = updateDeviceDto.brand || null;
    }
    if (updateDeviceDto.status !== undefined) {
      updateData.status = updateDeviceDto.status;
    }
    if (updateDeviceDto.workshopId !== undefined) {
      if (updateDeviceDto.workshopId && !isNaN(Number(updateDeviceDto.workshopId))) {
        updateData.workshopId = Number(updateDeviceDto.workshopId);
      } else {
        updateData.workshopId = null;
      }
    }
    if (updateDeviceDto.location !== undefined) {
      updateData.location = updateDeviceDto.location || null;
    }
    if (updateDeviceDto.purchaseDate !== undefined) {
      updateData.purchaseDate = updateDeviceDto.purchaseDate ? new Date(updateDeviceDto.purchaseDate) : null;
    }
    if (updateDeviceDto.warrantyUntil !== undefined) {
      updateData.warrantyUntil = updateDeviceDto.warrantyUntil ? new Date(updateDeviceDto.warrantyUntil) : null;
    }
    if (updateDeviceDto.spec !== undefined) {
      updateData.spec = updateDeviceDto.spec;
    }
    if (updateDeviceDto.imageUrls !== undefined) {
      updateData.imageUrls = updateDeviceDto.imageUrls;
    }
    
    Object.assign(device, updateData);
    return this.devicesRepository.save(device);
  }

  async remove(id: number): Promise<void> {
    const device = await this.findOne(id);
    await this.devicesRepository.remove(device);
  }

  async getStatistics() {
    const [total, inUse, trialRun, debugging, sealed, scrapped] = await Promise.all([
      this.devicesRepository.count(),
      this.devicesRepository.count({ where: { status: 'in_use' } }),
      this.devicesRepository.count({ where: { status: 'trial_run' } }),
      this.devicesRepository.count({ where: { status: 'debugging' } }),
      this.devicesRepository.count({ where: { status: 'sealed' } }),
      this.devicesRepository.count({ where: { status: 'scrapped' } }),
    ]);

    return { total, inUse, trialRun, debugging, sealed, scrapped };
  }

  async importFromExcel(file: Express.Multer.File, userId: number): Promise<{ success: number; failed: number; errors: any[] }> {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const errors: any[] = [];
      let success = 0;
      let failed = 0;

      // 状态映射
      const statusMap: Record<string, string> = {
        '在用': 'in_use',
        '试运行': 'trial_run',
        '调试': 'debugging',
        '封存': 'sealed',
        '报废': 'scrapped',
      };

      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        try {
          // 验证必填字段
          if (!row['设备编号'] || !row['设备名称']) {
            errors.push({ row: i + 2, error: '设备编号和设备名称为必填项' });
            failed++;
            continue;
          }

          // 检查设备编号是否已存在
          const existing = await this.devicesRepository.findOne({
            where: { assetNo: row['设备编号'] },
          });

          if (existing) {
            errors.push({ row: i + 2, error: `设备编号 ${row['设备编号']} 已存在` });
            failed++;
            continue;
          }

          // 转换状态
          const status = statusMap[row['状态']] || 'in_use';

          // 查找厂房（根据编号或名称，支持数字和字符串）
          let workshopId: number | null = null;
          if (row['厂房']) {
            try {
              const workshops = await this.workshopsService.findAllActive();
              const workshopValue = String(row['厂房']).trim();
              
              // 尝试精确匹配
              let workshop = workshops.find(
                (w) => String(w.code).trim() === workshopValue || 
                      String(w.name).trim() === workshopValue
              );
              
              // 如果找不到，尝试去除前后空格和特殊字符后匹配
              if (!workshop) {
                const normalizedValue = workshopValue.replace(/\s+/g, '');
                workshop = workshops.find(
                  (w) => String(w.code).trim().replace(/\s+/g, '') === normalizedValue ||
                        String(w.name).trim().replace(/\s+/g, '') === normalizedValue
                );
              }
              
              if (workshop) {
                workshopId = workshop.id;
              } else {
                // 厂房不存在，记录警告但不阻止导入（厂房为可选字段）
                errors.push({ 
                  row: i + 2, 
                  error: `警告：厂房 "${row['厂房']}" 不存在，设备将不关联厂房（请先在厂房管理中创建该厂房）` 
                });
                // 不增加failed计数，允许继续导入
              }
            } catch (error: any) {
              // 查找厂房失败，记录警告但不阻止导入
              errors.push({ 
                row: i + 2, 
                error: `警告：查找厂房失败: ${error.message}，设备将不关联厂房` 
              });
            }
          }

          // 创建设备
          const device = this.devicesRepository.create({
            assetNo: row['设备编号'],
            name: row['设备名称'],
            model: row['型号'] || null,
            brand: row['品牌'] || null,
            workshopId: workshopId,
            location: row['位置'] || null,
            status: status,
            purchaseDate: row['采购日期'] ? this.parseDate(row['采购日期']) : null,
            warrantyUntil: row['保修到期'] ? this.parseDate(row['保修到期']) : null,
            createdBy: userId,
          });

          await this.devicesRepository.save(device);
          success++;
        } catch (error: any) {
          errors.push({ row: i + 2, error: error.message || '导入失败' });
          failed++;
        }
      }

      return { success, failed, errors };
    } catch (error: any) {
      throw new BadRequestException(`Excel 文件解析失败: ${error.message}`);
    }
  }

  async exportToExcel(): Promise<Buffer> {
    const devices = await this.devicesRepository.find({
      relations: ['workshop', 'creator'],
    });

    // 状态映射
    const statusMap: Record<string, string> = {
      'in_use': '在用',
      'trial_run': '试运行',
      'debugging': '调试',
      'sealed': '封存',
      'scrapped': '报废',
    };

    const data = devices.map(device => ({
      '设备编号': device.assetNo,
      '设备名称': device.name,
      '型号': device.model || '',
      '品牌': device.brand || '',
      '状态': statusMap[device.status] || device.status,
      '厂房': device.workshop?.name || '',
      '位置': device.location || '',
      '采购日期': device.purchaseDate ? this.formatDate(device.purchaseDate) : '',
      '保修到期': device.warrantyUntil ? this.formatDate(device.warrantyUntil) : '',
      '创建时间': this.formatDate(device.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '设备列表');
    
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  async downloadTemplate(): Promise<Buffer> {
    try {
      const template = [
        {
          '设备编号': 'EQ-001',
          '设备名称': '示例设备',
          '型号': 'MODEL-001',
          '品牌': '品牌名称',
          '厂房': 'WS-001', // 厂房编号或名称
          '状态': '在用', // 可选值：在用、试运行、调试、封存、报废
          '位置': 'A区1号位',
          '采购日期': '2024-01-01',
          '保修到期': '2025-01-01',
        },
      ];

      if (!XLSX || !XLSX.utils) {
        throw new Error('XLSX 模块未正确加载');
      }

      const worksheet = XLSX.utils.json_to_sheet(template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '设备导入模板');
      
      const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
      
      if (!buffer || buffer.length === 0) {
        throw new Error('生成的 Excel 文件为空');
      }
      
      return buffer;
    } catch (error: any) {
      console.error('生成模板失败:', error);
      throw new BadRequestException(`生成模板失败: ${error.message || '未知错误'}`);
    }
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      // Excel日期序列号
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    }
    if (typeof value === 'string') {
      // 处理多种日期格式：2025/10/1, 2025-10-01, 2025-10-1 等
      const dateStr = value.trim();
      
      // 尝试替换斜杠为横杠
      const normalizedDate = dateStr.replace(/\//g, '-');
      
      // 处理日期格式：YYYY-M-D 或 YYYY-MM-DD
      const dateParts = normalizedDate.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // 月份从0开始
        const day = parseInt(dateParts[2], 10);
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      
      // 尝试标准日期解析
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null;
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
