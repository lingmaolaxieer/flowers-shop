import { Column, Entity, Index } from 'typeorm';
import { IdentityScope, RoleCode, Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 角色。tenant_id 为空表示平台预置角色；批发商可自定义角色。 */
@Entity('roles')
@Index(['tenantId', 'roleCode'])
export class Role extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true })
  tenantId?: string;

  @Column({ name: 'role_code', type: 'varchar', length: 64 })
  roleCode: RoleCode | string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'simple-enum', enum: IdentityScope, default: IdentityScope.PERSONAL })
  scope: IdentityScope;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
