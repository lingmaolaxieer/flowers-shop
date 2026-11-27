import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 消息模板：channel 取 subscribe（微信订阅消息）/ voice（语音播报）。 */
@Entity('notification_templates')
@Index(['tenantId', 'channel'])
@Index(['tenantId', 'templateKey'])
export class NotificationTemplate extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'template_key', type: 'varchar', length: 64 })
  templateKey: string;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  /** 微信订阅消息模板 ID，需人工配置 */
  @Column({ name: 'template_id', type: 'varchar', length: 128, nullable: true })
  templateId?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
