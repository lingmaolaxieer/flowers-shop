import { Column, Entity, Index } from 'typeorm';
import { PaymentStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 支付单。金额以整数分存储，bigint 列在 JS 侧用 string 承载。 */
@Entity('payments')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
@Index(['status'])
export class Payment extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  /** 商户订单号，全局唯一，回调对账主键 */
  @Column({ name: 'out_trade_no', type: 'varchar', length: 64, unique: true })
  outTradeNo: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  /** 支付金额，整数分 */
  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'simple-enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'transaction_id', type: 'varchar', length: 128, nullable: true })
  transactionId?: string | null;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt?: Date | null;

  /** 原始回调报文，保留用于审计与排错 */
  @Column({ name: 'raw_callback', type: 'text', nullable: true })
  rawCallback?: string | null;
}
