import { Column, Entity, Index } from 'typeorm';
import { CommissionDimension } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 抽成明细。退款以负数金额 + modeFlag:refund:* 记录，作为报表与冲抵数据源。 */
@Entity('commission_details')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderNo'])
export class CommissionDetail extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_no', type: 'varchar', length: 64 })
  orderNo: string;

  /** 关联订单 ID，供 M8 对账按订单汇总 */
  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId?: string | null;

  @Column({ name: 'order_amount', type: 'bigint' })
  orderAmount: number;

  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee: number;

  @Column({ type: 'simple-enum', enum: CommissionDimension })
  dimension: CommissionDimension;

  @Column({ type: 'float' })
  ratio: number;

  @Column({ type: 'bigint' })
  amount: number;

  /** profit_share / manual / refund:pre_share / refund:post_share / refund:manual_offset */
  @Column({ name: 'mode_flag', type: 'varchar', length: 32 })
  modeFlag: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;
}
