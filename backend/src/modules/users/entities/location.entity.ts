import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('locations')
export class Location extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number;

  @ManyToOne(() => Location, (location) => location.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Location;

  @OneToMany(() => Location, (location) => location.parent)
  children: Location[];

  @Column({ length: 50 })
  type: string; // 'department', 'workshop', 'location'

  @Column({ type: 'text', nullable: true })
  description: string;
}
