import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SparePartsController } from './spare-parts.controller';
import { SparePartsService } from './spare-parts.service';
import { SparePart } from './entities/spare-part.entity';
import { OldPart } from '../work-orders/entities/old-part.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SparePart, OldPart])],
  controllers: [SparePartsController],
  providers: [SparePartsService],
  exports: [SparePartsService],
})
export class SparePartsModule {}
