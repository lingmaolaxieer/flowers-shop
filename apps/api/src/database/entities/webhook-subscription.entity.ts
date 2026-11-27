import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** Webhook 订阅：同一租户同一事件只保留一个回调地址（重复订阅覆盖）。 */
@Entity('webhook_subscriptions')
@Index(['tenantId', 'event', 'callbackUrl'], { unique: true })
@Index(['tenantId', 'status'])
export class WebhookSubscription extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ type: 'varchar', length: 128 })
  event: string;

  @Column({ name: 'callback_url', type: 'varchar', length: 512 })
  callbackUrl: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
