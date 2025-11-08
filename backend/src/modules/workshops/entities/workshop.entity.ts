import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('workshops')
export class Workshop extends BaseEntity {
  @Column({ length: 100, unique: true })
  code: string; // 厂房编号

  @Column({ length: 200 })
  name: string; // 厂房名称

  @Column({ type: 'text', nullable: true })
  description: string; // 描述

  @Column({ length: 200, nullable: true })
  address: string; // 地址

  @Column({ name: 'is_active', default: true })
  isActive: boolean; // 是否启用
}

