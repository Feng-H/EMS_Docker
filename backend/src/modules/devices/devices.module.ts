import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { DevicePart } from './entities/device-part.entity';
import { WorkshopsModule } from '../workshops/workshops.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DevicePart]),
    WorkshopsModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
