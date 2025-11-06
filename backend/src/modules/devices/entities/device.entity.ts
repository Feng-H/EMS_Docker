import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { DevicePart } from './device-part.entity';
import { Workshop } from '../../workshops/entities/workshop.entity';

@Entity('devices')
export class Device extends BaseEntity {
  @Column({ name: 'asset_no', unique: true, length: 50 })
  assetNo: string;

  @Column({ length: 200 })
  name: string;

  @Column({ nullable: true, length: 100 })
  model: string;

  @Column({ nullable: true, length: 100 })
  brand: string;

  @Column({ name: 'workshop_id', nullable: true })
  workshopId: number;

  @ManyToOne(() => Workshop)
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop;

  @Column({ nullable: true, length: 200 })
  location: string; // 位置（文本输入）

  @Column({ default: 'in_use', length: 20 })
  status: string; // 'in_use', 'trial_run', 'debugging', 'sealed', 'scrapped'

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({ name: 'warranty_until', type: 'date', nullable: true })
  warrantyUntil: Date;

  @Column('jsonb', { default: {} })
  spec: Record<string, any>;

  @Column('simple-array', { name: 'image_urls', default: [] })
  imageUrls: string[];

  @Column('jsonb', { default: [] })
  attachments: any[];

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => DevicePart, (part) => part.device)
  parts: DevicePart[];
}

