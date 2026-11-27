import { Column, Entity, Index } from 'typeorm';
import { AuditStatus, Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 花店（店家主体）。入驻需营业执照+手机号+人工审核。 */
@Entity('shops')
@Index(['tenantId', 'supplierId'])
@Index(['ownerUserId'])
export class Shop extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'owner_user_id', type: 'bigint' })
  ownerUserId: string;

  @Column({ name: 'license_no', type: 'varchar', length: 64 })
  licenseNo: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20 })
  contactPhone: string;

  @Column({ name: 'audit_status', type: 'simple-enum', enum: AuditStatus, default: AuditStatus.PENDING })
  auditStatus: AuditStatus;

  @Column({ name: 'audited_by', type: 'bigint', nullable: true })
  auditedBy?: string;

  @Column({ name: 'audited_at', type: 'datetime', nullable: true })
  auditedAt?: Date;

  @Column({ name: 'audit_remark', type: 'varchar', length: 255, nullable: true })
  auditRemark?: string | null;

  /** 周期对账：day / week / month，M8 使用 */
  @Column({ name: 'settlement_cycle', type: 'varchar', length: 10, default: 'month' })
  settlementCycle: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
