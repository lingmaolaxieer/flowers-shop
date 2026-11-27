import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 对账单明细行。退款冲抵以负数金额、refType=refund 记录。 */
@Entity('settlement_statement_items')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['statementId'])
export class SettlementStatementItem extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'statement_id', type: 'bigint' })
  statementId: string;

  /** order / commission / refund / adjustment */
  @Column({ name: 'ref_type', type: 'varchar', length: 32 })
  refType: string;

  @Column({ name: 'ref_no', type: 'varchar', length: 64 })
  refNo: string;

  /** 关联订单号（报表展示用） */
  @Column({ name: 'order_no', type: 'varchar', length: 64, nullable: true })
  orderNo?: string;

  @Column({ name: 'order_amount', type: 'bigint', default: 0 })
  orderAmount: number;

  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee: number;

  @Column({ name: 'commission_amount', type: 'bigint', default: 0 })
  commissionAmount: number;

  @Column({ name: 'refund_amount', type: 'bigint', default: 0 })
  refundAmount: number;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark?: string | null;
}
