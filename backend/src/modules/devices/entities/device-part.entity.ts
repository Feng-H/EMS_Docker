import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from './device.entity';

@Entity('device_parts')
export class DevicePart extends BaseEntity {
  @Column({ name: 'device_id' })
  deviceId: number;

  @ManyToOne(() => Device, (device) => device.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'parent_part_id', nullable: true })
  parentPartId: number;

  @ManyToOne(() => DevicePart, (part) => part.children, { nullable: true })
  @JoinColumn({ name: 'parent_part_id' })
  parent: DevicePart;

  @OneToMany(() => DevicePart, (part) => part.parent)
  children: DevicePart[];

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'part_no', nullable: true, length: 50 })
  partNo: string;

  @Column('jsonb', { default: {} })
  spec: Record<string, any>;
}

