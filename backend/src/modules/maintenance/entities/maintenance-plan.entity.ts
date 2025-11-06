import { Entity, Column, ManyToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';
import { Location } from '../../users/entities/location.entity';
import { User } from '../../users/entities/user.entity';
import { MaintenanceTask } from './maintenance-task.entity';
import { MaintenanceItem } from './maintenance-item.entity';
import { MaintenancePlanDevice } from './maintenance-plan-device.entity';

@Entity('maintenance_plans')
export class MaintenancePlan extends BaseEntity {
  // 移除单设备关联，改为多对多关系

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'frequency_type', length: 20 })
  frequencyType: string; // 'shift' (班次), 'daily', 'weekly', 'monthly', 'yearly'

  @Column({ name: 'frequency_value' })
  frequencyValue: number; // 频率值，如每2个班次、每3天等

  @Column({ name: 'next_due_at', type: 'timestamp', nullable: true })
  nextDueAt: Date;

  @Column({ name: 'assigned_group_id', nullable: true })
  assignedGroupId: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'assigned_group_id' })
  assignedGroup: Location;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => MaintenanceTask, (task) => task.plan)
  tasks: MaintenanceTask[];

  @OneToMany(() => MaintenanceItem, (item) => item.plan, { cascade: true })
  items: MaintenanceItem[];

  @OneToMany(() => MaintenancePlanDevice, (mpd) => mpd.plan, { cascade: true })
  planDevices: MaintenancePlanDevice[];

  // 便捷访问：通过 planDevices 获取设备列表
  devices?: Device[];
}

