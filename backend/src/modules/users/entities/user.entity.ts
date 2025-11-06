import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from './role.entity';
import { Location } from './location.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'employee_no', unique: true })
  employeeNo: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'role_id', nullable: true })
  roleId: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'department_id' })
  department: Location;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column('jsonb', { default: [] })
  skills: string[];

  @Column('jsonb', { name: 'availability_calendar', default: {} })
  availabilityCalendar: Record<string, any>;
}
