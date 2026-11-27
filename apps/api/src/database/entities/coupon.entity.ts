import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/**
 * 优惠券模板。
 * type=fixed：amount 为立减金额（分）；
 * type=percent：amount 为折扣百分比（0-100，如 80 表示 8 折）。
 */
@Entity('coupons')
@Index(['tenantId', 'supplierId', 'status'])
@Index(['tenantId', 'supplierId', 'code'])
export class Coupon extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** 券码，试算时用 couponCode 匹配 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  code?: string | null;

  /** fixed / percent */
  @Column({ type: 'varchar', length: 16 })
  type: string;

  /** fixed=立减分；percent=折扣百分比(0-100) */
  @Column({ type: 'int' })
  amount: number;

  /** 使用门槛（分），0 表示无门槛 */
  @Column({ type: 'int', default: 0 })
  threshold: number;

  @Column({ name: 'valid_from', type: 'datetime', nullable: true })
  validFrom?: Date | null;

  @Column({ name: 'valid_to', type: 'datetime', nullable: true })
  validTo?: Date | null;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
