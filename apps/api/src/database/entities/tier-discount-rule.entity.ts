import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 起批量优惠：qty >= minQty 时生效。
 * discount 语义：0 < discount < 1 表示折扣率（如 0.85 = 85 折）；
 * discount >= 1 表示直接立减金额（分，如 500 = 减 5 元）。
 */
@Entity('tier_discount_rules')
@Index(['tenantId', 'supplierId', 'skuId'])
export class TierDiscountRule extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  @Column({ name: 'min_qty', type: 'int' })
  minQty: number;

  /** 折扣率(0-1) 或 立减金额(分，>=1)，见类注释 */
  @Column({ type: 'float' })
  discount: number;
}
