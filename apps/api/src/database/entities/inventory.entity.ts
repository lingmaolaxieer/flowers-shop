import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 店家独立库存：一个花店一个 SKU 一条记录。total=available+locked。 */
@Entity('inventories')
@Index(['tenantId', 'supplierId', 'shopId', 'skuId'])
export class Inventory extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 总量 */
  @Column({ type: 'int', default: 0 })
  total: number;

  /** 可售量 */
  @Column({ type: 'int', default: 0 })
  available: number;

  /** 已锁定量 */
  @Column({ type: 'int', default: 0 })
  locked: number;
}
