import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

@Entity('work_orders')
export class WorkOrder extends BaseEntity {
  @Column({ name: 'order_no', unique: true, length: 50 })
  orderNo: string;

  @Column({ name: 'reporter_id', nullable: true })
  reporterId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'device_id', nullable: true })
  deviceId: number;

  @ManyToOne(() => Device, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'normal', length: 20 })
  priority: string; // 'low', 'normal', 'high', 'urgent'

  @Column({ default: 'created', length: 20 })
  status: string; // 'created', 'assigned', 'accepted', 'in_progress', 'pending_acceptance', 'completed', 'closed'

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @Column({ length: 100, nullable: true })
  contact: string;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'reported_at', type: 'timestamp', nullable: true })
  reportedAt: Date; // 报修时间

  @Column({ name: 'response_time', nullable: true })
  responseTime: number; // 响应时间（分钟）

  @Column({ name: 'repair_time', nullable: true })
  repairTime: number; // 维修时间（分钟）

  @Column('simple-array', { default: [] })
  attachments: string[];

  @Column({ name: 'fault_category', nullable: true, length: 100 })
  faultCategory: string;

  @Column({ name: 'fault_cause', type: 'text', nullable: true })
  faultCause: string;

  @Column({ type: 'text', nullable: true })
  solution: string;
}

