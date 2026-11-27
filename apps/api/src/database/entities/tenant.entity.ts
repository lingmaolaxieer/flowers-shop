import { Column, Entity } from 'typeorm';
import { Status, TenantType } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 租户：平台运营 / 批发商。多批发商入驻的基础。 */
@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'simple-enum', enum: TenantType, default: TenantType.SUPPLIER })
  type: TenantType;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
