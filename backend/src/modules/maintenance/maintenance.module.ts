import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceSchedulerService } from './maintenance-scheduler.service';
import { MaintenancePlan } from './entities/maintenance-plan.entity';
import { MaintenanceTask } from './entities/maintenance-task.entity';
import { MaintenanceItem } from './entities/maintenance-item.entity';
import { MaintenancePlanDevice } from './entities/maintenance-plan-device.entity';
import { Device } from '../devices/entities/device.entity';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenancePlan, MaintenanceTask, MaintenanceItem, MaintenancePlanDevice, Device]),
    WorkOrdersModule,
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceSchedulerService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
