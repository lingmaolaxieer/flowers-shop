import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Inventory,
  InventoryLock,
  InventoryLog,
  LossRecord,
  StockAlert,
} from '../../database/entities';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      InventoryLock,
      InventoryLog,
      LossRecord,
      StockAlert,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
