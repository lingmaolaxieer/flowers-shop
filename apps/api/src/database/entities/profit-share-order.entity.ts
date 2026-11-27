import { Column, Entity, Index } from 'typeorm';
import { ProfitShareStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 微信分账单。freezeUntil 为资金冻结到期时间，退款回退窗口按其 +180 天计算。 */
@Entity('profit_share_orders')
@Index(['tenantId', 'supplierId', 'shopId', 'status'])
@Index(['paymentId'])
export class ProfitShareOrder extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'payment_id', type: 'bigint' })
  paymentId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  /** 分账接收方账号（需人工配置， mock 下为占位值） */
  @Column({ type: 'varchar', length: 128 })
  receiver: string;

  /** 分账金额，整数分 */
  @Column({ type: 'bigint' })
  amount: number;

  /** 分账比例 0~1 */
  @Column({ type: 'float' })
  ratio: number;

  @Column({ name: 'freeze_until', type: 'datetime', nullable: true })
  freezeUntil?: Date | null;

  @Column({ type: 'simple-enum', enum: ProfitShareStatus, default: ProfitShareStatus.PENDING })
  status: ProfitShareStatus;
}
