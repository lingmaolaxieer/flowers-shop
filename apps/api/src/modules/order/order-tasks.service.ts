import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { OrderStatus } from '@flower/shared';
import { Order } from '../../database/entities/order.entity';
import { OrderStatusLog } from '../../database/entities/order-status-log.entity';
import { InventoryService } from '../inventory/inventory.service';

/** 超时自动取消：每分钟扫描待确认超时订单，取消并释放库存锁。 */
@Injectable()
export class OrderTasksService {
  private readonly logger = new Logger(OrderTasksService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
  ) {}

  @Cron('*/1 * * * *')
  async cancelExpiredOrders(): Promise<void> {
    const expired = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING_CONFIRM,
        confirmDeadline: LessThan(new Date()),
      },
    });

    for (const order of expired) {
      await this.dataSource.transaction(async (manager) => {
        // 事务内二次校验，避免与店家确认并发时误取消
        const fresh = await manager.getRepository(Order).findOne({
          where: { id: order.id, status: OrderStatus.PENDING_CONFIRM },
        });
        if (!fresh) return;

        await manager.getRepository(Order).update(
          { id: fresh.id },
          {
            status: OrderStatus.CANCELLED,
            cancelReason: '确认超时，系统自动取消',
          },
        );

        const logRepo = manager.getRepository(OrderStatusLog);
        await logRepo.save(
          logRepo.create({
            tenantId: fresh.tenantId,
            supplierId: fresh.supplierId,
            shopId: fresh.shopId,
            orderId: fresh.id,
            fromStatus: OrderStatus.PENDING_CONFIRM,
            toStatus: OrderStatus.CANCELLED,
            operatorId: null,
            note: '确认超时，系统自动取消',
          }),
        );
      });

      try {
        await this.inventoryService.unlockStock(
          {
            tenantId: order.tenantId,
            supplierId: order.supplierId,
            shopId: order.shopId,
          },
          order.id,
        );
      } catch (error) {
        this.logger.error(`订单 ${order.id} 超时取消后释放库存锁失败`, error as Error);
      }
    }
  }
}
