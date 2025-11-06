import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('spare_parts')
export class SparePart extends BaseEntity {
  @Column({ name: 'part_no', unique: true, length: 50 })
  partNo: string;

  @Column({ length: 200 })
  name: string;

  @Column('jsonb', { default: {} })
  spec: Record<string, any>;

  @Column({ nullable: true, length: 200 })
  supplier: string;

  @Column({ nullable: true, length: 100 })
  brand: string;

  @Column({ name: 'stock_qty', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockQty: number;

  @Column({ name: 'min_stock', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minStock: number;

  @Column({ length: 20, default: 'pc' })
  unit: string; // 'pc', 'set', 'm'

  @Column({ nullable: true, length: 100 })
  location: string;

  @Column('simple-array', { name: 'image_urls', default: [] })
  imageUrls: string[];
}

