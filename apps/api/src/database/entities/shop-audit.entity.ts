import { Column, Entity, Index } from 'typeorm';
import { AuditStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 店家入驻审核记录。营业执照真实性需人工核验（本系统只存证）。 */
@Entity('shop_audits')
@Index(['tenantId', 'status'])
@Index(['shopId'])
export class ShopAudit extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'license_no', type: 'varchar', length: 64 })
  licenseNo: string;

  @Column({ name: 'license_image', type: 'varchar', length: 255, nullable: true })
  licenseImage?: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20 })
  contactPhone: string;

  @Column({ type: 'simple-enum', enum: AuditStatus, default: AuditStatus.PENDING })
  status: AuditStatus;

  @Column({ name: 'auditor_id', type: 'bigint', nullable: true })
  auditorId?: string;

  @Column({ name: 'audit_remark', type: 'varchar', length: 255, nullable: true })
  auditRemark?: string | null;
}
