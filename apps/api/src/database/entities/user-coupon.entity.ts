import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 用户持有的券。usedOrderId 在核销时写入，防止重复使用。 */
@Entity('user_coupons')
@Index(['tenantId', 'userId', 'used'])
@Index(['tenantId', 'couponId', 'userId'])
export class UserCoupon extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'coupon_id', type: 'bigint' })
  couponId: string;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ name: 'used_order_id', type: 'bigint', nullable: true })
  usedOrderId?: string | null;

  @Column({ name: 'obtained_at', type: 'datetime' })
  obtainedAt: Date;
}
