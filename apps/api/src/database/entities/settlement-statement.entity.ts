import { Column, Entity, Index } from 'typeorm';
import { StatementStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 周期对账单（day / week / month）。人工结算模式下用于线下冲抵。 */
@Entity('settlement_statements')
@Index(['tenantId', 'supplierId', 'shopId', 'periodEnd'])
export class SettlementStatement extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  /** 对账单号，便于检索与导出 */
  @Column({ name: 'statement_no', type: 'varchar', length: 64, nullable: true })
  statementNo?: string;

  @Column({ type: 'varchar', length: 10 })
  cycle: string;

  @Column({ name: 'period_start', type: 'datetime' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'datetime' })
  periodEnd: Date;

  @Column({ type: 'simple-enum', enum: StatementStatus, default: StatementStatus.GENERATED })
  status: StatementStatus;

  @Column({ name: 'total_amount', type: 'bigint', default: 0 })
  totalAmount: number;

  @Column({ name: 'commission_amount', type: 'bigint', default: 0 })
  commissionAmount: number;

  @Column({ name: 'order_amount', type: 'bigint', default: 0 })
  orderAmount: number;

  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee: number;

  @Column({ name: 'refund_amount', type: 'bigint', default: 0 })
  refundAmount: number;

  @Column({ name: 'net_amount', type: 'bigint', default: 0 })
  netAmount: number;
}
