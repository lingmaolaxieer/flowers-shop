import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 支付回调流水。out_trade_no + event_type 唯一，用于幂等去重。 */
@Entity('payment_callbacks')
@Index(['outTradeNo', 'eventType'], { unique: true })
@Index(['tenantId'])
export class PaymentCallback extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'out_trade_no', type: 'varchar', length: 64 })
  outTradeNo: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType: string;

  @Column({ name: 'raw_body', type: 'text' })
  rawBody: string;

  /** 验签是否通过 */
  @Column({ type: 'boolean', default: false })
  verified: boolean;

  /** 是否已成功驱动业务状态变更 */
  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error?: string | null;
}
