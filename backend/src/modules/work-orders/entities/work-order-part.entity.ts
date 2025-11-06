import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { WorkOrder } from './work-order.entity';
import { SparePart } from '../../spare-parts/entities/spare-part.entity';

@Entity('work_order_parts')
export class WorkOrderPart extends BaseEntity {
  @Column({ name: 'work_order_id' })
  workOrderId: number;

  @ManyToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'part_id' })
  partId: number;

  @ManyToOne(() => SparePart)
  @JoinColumn({ name: 'part_id' })
  part: SparePart;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  qty: number;
}

