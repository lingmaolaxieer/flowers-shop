import { Column, Entity, Index } from 'typeorm';
import { AfterSaleType } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 售后单：退款 / 部分退款 / 缺货替换 / 价差补退。priceDiff 单位为分。 */
@Entity('after_sales')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
export class AfterSale extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ type: 'simple-enum', enum: AfterSaleType })
  type: AfterSaleType;

  @Column({ name: 'price_diff', type: 'bigint', nullable: true })
  priceDiff?: number | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId?: string | null;
}
