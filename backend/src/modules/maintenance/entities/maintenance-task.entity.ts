import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MaintenancePlan } from './maintenance-plan.entity';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

@Entity('maintenance_tasks')
export class MaintenanceTask extends BaseEntity {
  @Column({ name: 'plan_id', nullable: true })
  planId: number;

  @ManyToOne(() => MaintenancePlan, (plan) => plan.tasks)
  @JoinColumn({ name: 'plan_id' })
  plan: MaintenancePlan;

  @Column({ name: 'device_id' })
  deviceId: number;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @Column({ default: 'pending', length: 20 })
  status: string; // 'pending', 'in_progress', 'pending_acceptance', 'completed', 'cancelled', 'overdue'

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column('jsonb', { default: {} })
  result: Record<string, any>; // 执行结果，格式: { itemId: { type: 'qualitative'|'quantitative', value: string|number, status: 'normal'|'abnormal' } }

  @Column({ name: 'has_abnormal', default: false })
  hasAbnormal: boolean; // 是否有异常项

  @Column({ name: 'abnormal_work_order_id', nullable: true })
  abnormalWorkOrderId: number; // 关联的异常工单ID

  @Column('simple-array', { default: [] })
  attachments: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;
}

