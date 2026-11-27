import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 订单明细。retailPrice 顾客可见；wholesalePrice 仅店家/批发商可读，
 * 顾客端接口必须用白名单 VO 映射，禁止返回 wholesalePrice。
 */
@Entity('order_items')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
@Index(['skuId'])
export class OrderItem extends BaseEntity {
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

  @Column({ name: 'product_name', type: 'varchar', length: 128 })
  productName: string;

  @Column({ type: 'varchar', length: 16 })
  unit: string;

  @Column({ type: 'int' })
  qty: number;

  /** 顾客零售价，单位：分 */
  @Column({ name: 'retail_price', type: 'bigint' })
  retailPrice: number;

  /** 店家/批发价，单位：分，顾客端禁止下发 */
  @Column({ name: 'wholesale_price', type: 'bigint' })
  wholesalePrice: number;
}
