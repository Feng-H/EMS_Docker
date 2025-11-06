import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrder } from './entities/work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { OldPart } from './entities/old-part.entity';
import { SparePartsModule } from '../spare-parts/spare-parts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkOrder, WorkOrderPart, OldPart]),
    SparePartsModule,
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
