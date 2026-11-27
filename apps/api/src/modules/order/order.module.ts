import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AfterSale } from '../../database/entities/after-sale.entity';
import { Order } from '../../database/entities/order.entity';
import { OrderAddress } from '../../database/entities/order-address.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderMessage } from '../../database/entities/order-message.entity';
import { OrderStatusLog } from '../../database/entities/order-status-log.entity';
import { Refund } from '../../database/entities/refund.entity';
import { Shop } from '../../database/entities/shop.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { AdminOrderController, OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderTasksService } from './order-tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusLog,
      OrderMessage,
      OrderAddress,
      Refund,
      AfterSale,
      SystemConfig,
      Shop,
    ]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService, OrderTasksService],
  exports: [OrderService],
})
export class OrderModule {}
