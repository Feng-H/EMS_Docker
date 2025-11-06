import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { MaintenancePlan } from './maintenance-plan.entity';
import { Device } from '../../devices/entities/device.entity';

@Entity('maintenance_plan_devices')
export class MaintenancePlanDevice {
  @PrimaryColumn({ name: 'plan_id' })
  planId: number;

  @ManyToOne(() => MaintenancePlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: MaintenancePlan;

  @PrimaryColumn({ name: 'device_id' })
  deviceId: number;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

