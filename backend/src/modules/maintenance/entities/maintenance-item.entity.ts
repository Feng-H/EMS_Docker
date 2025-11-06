import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MaintenancePlan } from './maintenance-plan.entity';

@Entity('maintenance_items')
export class MaintenanceItem extends BaseEntity {
  @Column({ name: 'plan_id' })
  planId: number;

  @ManyToOne(() => MaintenancePlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: MaintenancePlan;

  @Column({ length: 200 })
  name: string; // 保养内容名称

  @Column({ name: 'item_type', length: 20 })
  itemType: string; // 'qualitative' (定性) 或 'quantitative' (定量)

  // 定性选项（仅当 itemType 为 'qualitative' 时使用）
  @Column('jsonb', { nullable: true })
  qualitativeOptions?: {
    normal: string; // 正常选项文本，默认 '正常'
    abnormal: string; // 异常选项文本，默认 '异常'
  };

  // 定量设置（仅当 itemType 为 'quantitative' 时使用）
  @Column('jsonb', { nullable: true })
  quantitativeSettings?: {
    unit: string; // 单位，如 '℃', 'bar', 'mm' 等
    minValue?: number; // 最小值（下限）
    maxValue?: number; // 最大值（上限）
  };

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number; // 排序顺序

  @Column({ type: 'text', nullable: true })
  description?: string; // 描述说明
}

