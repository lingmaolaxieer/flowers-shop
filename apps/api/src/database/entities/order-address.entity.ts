import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 订单收货 / 自提信息。type: delivery（配送）/ pickup（自提）。 */
@Entity('order_addresses')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
export class OrderAddress extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ type: 'varchar', length: 64 })
  receiver: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ name: 'area_id', type: 'bigint', nullable: true })
  areaId?: string | null;
}
