import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 店家等级价：按花店等级（level）给 SKU 的批发价。price 单位：分。 */
@Entity('shop_level_prices')
@Index(['tenantId', 'supplierId', 'skuId', 'level'])
export class ShopLevelPrice extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 花店等级标识，如 'A' / 'B' / 'VIP' */
  @Column({ type: 'varchar', length: 32 })
  level: string;

  /** 批发价，单位：分 */
  @Column({ type: 'bigint' })
  price: number;
}
