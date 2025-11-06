import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop } from './entities/workshop.entity';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private workshopsRepository: Repository<Workshop>,
  ) {}

  async create(createWorkshopDto: CreateWorkshopDto): Promise<Workshop> {
    // 检查编号是否已存在
    const existing = await this.workshopsRepository.findOne({
      where: { code: createWorkshopDto.code },
    });

    if (existing) {
      throw new BadRequestException(`厂房编号 ${createWorkshopDto.code} 已存在`);
    }

    const workshop = this.workshopsRepository.create(createWorkshopDto);
    return this.workshopsRepository.save(workshop);
  }

  async findAll(page = 1, limit = 10, search?: string): Promise<{ data: Workshop[]; total: number }> {
    const query = this.workshopsRepository.createQueryBuilder('workshop');

    if (search) {
      query.where(
        '(workshop.name LIKE :search OR workshop.code LIKE :search OR workshop.address LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('workshop.created_at', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findAllActive(): Promise<Workshop[]> {
    return this.workshopsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Workshop> {
    const workshop = await this.workshopsRepository.findOne({
      where: { id },
    });

    if (!workshop) {
      throw new NotFoundException(`厂房 ID ${id} 不存在`);
    }

    return workshop;
  }

  async update(id: number, updateWorkshopDto: UpdateWorkshopDto): Promise<Workshop> {
    const workshop = await this.findOne(id);

    // 如果更新编号，检查是否重复
    if (updateWorkshopDto.code && updateWorkshopDto.code !== workshop.code) {
      const existing = await this.workshopsRepository.findOne({
        where: { code: updateWorkshopDto.code },
      });

      if (existing) {
        throw new BadRequestException(`厂房编号 ${updateWorkshopDto.code} 已存在`);
      }
    }

    Object.assign(workshop, updateWorkshopDto);
    return this.workshopsRepository.save(workshop);
  }

  async remove(id: number): Promise<void> {
    const workshop = await this.findOne(id);
    await this.workshopsRepository.remove(workshop);
  }
}

