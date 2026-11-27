import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 用户积分账户：按租户 + 花店 + 用户唯一。 */
@Entity('points_accounts')
@Index(['tenantId', 'shopId', 'userId'], { unique: true })
export class PointsAccount extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  balance: number;
}
