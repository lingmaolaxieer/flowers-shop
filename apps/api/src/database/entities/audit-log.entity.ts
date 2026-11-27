import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 操作审计日志：记录敏感写操作（对账确认、审核、导出等）。 */
@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'action'])
export class AuditLog extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  /** 操作码，例如 statement.confirm / report.export */
  @Column({ type: 'varchar', length: 64 })
  action: string;

  /** 操作对象（实体类型 + ID） */
  @Column({ type: 'varchar', length: 128, nullable: true })
  target?: string | null;

  /** 变更详情 JSON / 文本说明 */
  @Column({ type: 'text', nullable: true })
  detail?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;
}
