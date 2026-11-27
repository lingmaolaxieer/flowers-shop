import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 一店一价：针对具体花店的专属批发价。price 单位：分。 */
@Entity('shop_specific_prices')
@Index(['tenantId', 'supplierId', 'shopId', 'skuId'])
export class ShopSpecificPrice extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 批发价，单位：分 */
  @Column({ type: 'bigint' })
  price: number;
}
