import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 通知发送日志：订阅消息/语音的每次调用都留痕。 */
@Entity('notification_logs')
@Index(['tenantId', 'channel'])
@Index(['tenantId', 'templateKey'])
@Index(['receiver'])
export class NotificationLog extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  /** 接收方 openid（语音渠道可存设备/号码标识） */
  @Column({ type: 'varchar', length: 64 })
  receiver: string;

  @Column({ name: 'template_key', type: 'varchar', length: 64 })
  templateKey: string;

  @Column({ type: 'text', nullable: true })
  payload?: string;

  /** success / failed */
  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error?: string;
}
