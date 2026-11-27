import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 幂等键：同一租户内 key 唯一，用于生成对账单/导出等重复请求去重。
 * createdAt 继承 BaseEntity（由数据库自动生成）。
 */
@Entity('idempotency_keys')
@Index(['tenantId', 'key'], { unique: true })
export class IdempotencyKey extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ type: 'varchar', length: 128 })
  key: string;

  /** 业务场景，例如 statement.generate / report.export */
  @Column({ type: 'varchar', length: 64, nullable: true })
  scope?: string | null;

  /** 首次请求的结果快照（JSON 文本） */
  @Column({ type: 'text', nullable: true })
  response?: string | null;
}
