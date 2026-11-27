import { Column, Entity, Index } from 'typeorm';
import { RefundType } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 退款单。金额单位为分；库存回滚与分账回滚状态由后续里程碑异步推进。 */
@Entity('refunds')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
export class Refund extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'refund_no', type: 'varchar', length: 64, unique: true })
  refundNo: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ type: 'simple-enum', enum: RefundType })
  type: RefundType;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ name: 'inventory_status', type: 'varchar', length: 32, nullable: true })
  inventoryStatus?: string | null;

  @Column({ name: 'profit_share_rollback_status', type: 'varchar', length: 32, nullable: true })
  profitShareRollbackStatus?: string | null;
}
