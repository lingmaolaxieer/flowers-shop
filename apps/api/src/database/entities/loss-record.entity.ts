import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 损耗登记：只减 total/available，不做自动回补。 */
@Entity('loss_records')
@Index(['tenantId', 'supplierId', 'shopId', 'skuId'])
export class LossRecord extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ name: 'operator_id', type: 'bigint' })
  operatorId: string;
}
