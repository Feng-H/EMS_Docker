import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SparePart } from './entities/spare-part.entity';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { OldPart } from '../work-orders/entities/old-part.entity';

@Injectable()
export class SparePartsService {
  constructor(
    @InjectRepository(SparePart)
    private sparePartsRepository: Repository<SparePart>,
    @InjectRepository(OldPart)
    private oldPartRepository: Repository<OldPart>,
  ) {}

  async create(createDto: CreateSparePartDto): Promise<SparePart> {
    const part = this.sparePartsRepository.create(createDto);
    return this.sparePartsRepository.save(part);
  }

  async findAll(page = 1, limit = 10, search?: string): Promise<{ data: SparePart[]; total: number }> {
    const query = this.sparePartsRepository.createQueryBuilder('part');

    if (search) {
      query.where('part.name LIKE :search OR part.partNo LIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('part.created_at', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number): Promise<SparePart> {
    const part = await this.sparePartsRepository.findOne({ where: { id } });

    if (!part) {
      throw new NotFoundException(`备件 ID ${id} 不存在`);
    }

    return part;
  }

  async update(id: number, updateDto: Partial<CreateSparePartDto>): Promise<SparePart> {
    const part = await this.findOne(id);
    Object.assign(part, updateDto);
    return this.sparePartsRepository.save(part);
  }

  async remove(id: number): Promise<void> {
    const part = await this.findOne(id);
    await this.sparePartsRepository.remove(part);
  }

  async getLowStock(): Promise<SparePart[]> {
    return this.sparePartsRepository
      .createQueryBuilder('part')
      .where('part.stockQty <= part.minStock')
      .getMany();
  }

  /**
   * 获取旧件台账列表
   */
  async getOldParts(page = 1, limit = 10, search?: string): Promise<{ data: OldPart[]; total: number }> {
    const query = this.oldPartRepository.createQueryBuilder('oldPart')
      .leftJoinAndSelect('oldPart.workOrder', 'workOrder')
      .leftJoinAndSelect('oldPart.device', 'device');

    if (search) {
      query.where(
        '(oldPart.name LIKE :search OR oldPart.partNo LIKE :search OR device.name LIKE :search OR device.asset_no LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('oldPart.created_at', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async getStatistics() {
    try {
      const result = await this.sparePartsRepository
        .createQueryBuilder('part')
        .select([
          'COUNT(*) as total',
          'SUM(CASE WHEN part.stock_qty <= part.min_stock THEN 1 ELSE 0 END) as lowStock',
        ])
        .getRawOne();

      // 如果没有 price 字段，只返回基本统计
      return {
        total: parseInt(result?.total) || 0,
        lowStock: parseInt(result?.lowStock) || 0,
        totalValue: 0, // 如果数据库没有 price 字段，返回 0
      };
    } catch (error) {
      console.error('备件统计错误:', error);
      // 如果查询失败，返回默认值
      const total = await this.sparePartsRepository.count();
      return {
        total,
        lowStock: 0,
        totalValue: 0,
      };
    }
  }
}
