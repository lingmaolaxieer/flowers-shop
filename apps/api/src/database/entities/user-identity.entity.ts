import { Column, Entity, Index } from 'typeorm';
import { AuditStatus, RoleCode, Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 用户身份：同一微信用户可拥有多个身份并切换。 */
@Entity('user_identities')
@Index(['userId'])
@Index(['tenantId'])
export class UserIdentity extends BaseEntity {
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'role_code', type: 'simple-enum', enum: RoleCode })
  roleCode: RoleCode;

  @Column({ name: 'supplier_id', type: 'bigint', nullable: true })
  supplierId?: string;

  @Column({ name: 'shop_id', type: 'bigint', nullable: true })
  shopId?: string;

  @Column({ name: 'audit_status', type: 'simple-enum', enum: AuditStatus, default: AuditStatus.APPROVED })
  auditStatus: AuditStatus;

  @Column({ name: 'last_used_at', type: 'datetime', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
