import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 库存锁单记录：订单占用库存的凭条，扣减/解锁按 orderId 回溯。 */
@Entity('inventory_locks')
@Index(['tenantId', 'supplierId', 'shopId', 'orderId'])
@Index(['tenantId', 'supplierId', 'skuId', 'orderId'])
export class InventoryLock extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ name: 'expire_at', type: 'datetime' })
  expireAt: Date;
}
