import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 用户订阅授权记录（微信订阅消息一次性/长期授权）。 */
@Entity('subscription_records')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'templateKey'])
export class SubscriptionRecord extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  openid: string;

  @Column({ name: 'template_id', type: 'varchar', length: 128 })
  templateId: string;

  @Column({ name: 'template_key', type: 'varchar', length: 64 })
  templateKey: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
