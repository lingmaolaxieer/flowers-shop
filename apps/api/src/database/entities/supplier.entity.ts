import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';

/** 批发商，归属一个租户。 */
@Entity('suppliers')
@Index(['tenantId'])
export class Supplier extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 64, nullable: true })
  contactName?: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
