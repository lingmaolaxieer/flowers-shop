import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryArea } from '../../database/entities/delivery-area.entity';
import { DeliveryFeeRule } from '../../database/entities/delivery-fee-rule.entity';
import { DeliveryPerson } from '../../database/entities/delivery-person.entity';
import { DeliveryStatusLog } from '../../database/entities/delivery-status-log.entity';
import { Shipment } from '../../database/entities/shipment.entity';
import {
  DeliveryAreaController,
  DeliveryPersonController,
  DeliveryQuoteController,
  DeliveryStatusController,
  ShipmentController,
} from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryArea,
      DeliveryFeeRule,
      Shipment,
      DeliveryPerson,
      DeliveryStatusLog,
    ]),
  ],
  controllers: [
    DeliveryAreaController,
    DeliveryQuoteController,
    ShipmentController,
    DeliveryStatusController,
    DeliveryPersonController,
  ],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
