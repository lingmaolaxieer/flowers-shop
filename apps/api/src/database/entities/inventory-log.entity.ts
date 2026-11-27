import { Column, Entity, Index } from 'typeorm';
import { InventoryChangeType } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 库存流水：beforeQty/afterQty 针对 available 变更前后的快照。 */
@Entity('inventory_logs')
@Index(['tenantId', 'supplierId', 'shopId', 'skuId'])
@Index(['tenantId', 'supplierId', 'refNo'])
export class InventoryLog extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  @Column({ name: 'change_type', type: 'simple-enum', enum: InventoryChangeType })
  changeType: InventoryChangeType;

  /** 变更数量（可正可负，出库登记取负数） */
  @Column({ type: 'int' })
  qty: number;

  @Column({ name: 'before_qty', type: 'int' })
  beforeQty: number;

  @Column({ name: 'after_qty', type: 'int' })
  afterQty: number;

  /** 关联单号：订单号 / 调整单号 / 损耗单号 */
  @Column({ name: 'ref_no', type: 'varchar', length: 64, nullable: true })
  refNo?: string | null;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId?: string | null;
}
