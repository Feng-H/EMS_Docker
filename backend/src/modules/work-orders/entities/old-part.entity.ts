import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { WorkOrder } from './work-order.entity';
import { Device } from '../../devices/entities/device.entity';

@Entity('old_parts')
export class OldPart extends BaseEntity {
  @Column({ name: 'work_order_id' })
  workOrderId: number;

  @ManyToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'device_id', nullable: true })
  deviceId: number;

  @ManyToOne(() => Device, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'part_no', length: 50 })
  partNo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  qty: number;

  @Column({ length: 200 })
  name: string;

  @Column('jsonb', { default: {} })
  spec: Record<string, any>;

  @Column({ nullable: true, length: 200 })
  supplier: string;

  @Column({ length: 20, default: 'pc' })
  unit: string; // 'pc', 'set', 'm'

  @Column({ nullable: true, length: 100 })
  location: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}

