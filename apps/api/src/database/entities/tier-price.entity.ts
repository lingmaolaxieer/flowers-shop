import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 阶梯价：按起订量 minQty 命中的批发价。price 单位：分。 */
@Entity('tier_prices')
@Index(['tenantId', 'supplierId', 'skuId', 'minQty'])
export class TierPrice extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 该档最低数量（含） */
  @Column({ name: 'min_qty', type: 'int' })
  minQty: number;

  /** 批发价，单位：分 */
  @Column({ type: 'bigint' })
  price: number;
}
