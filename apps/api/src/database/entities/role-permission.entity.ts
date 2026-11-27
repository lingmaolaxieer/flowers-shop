import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 角色-权限关联。 */
@Entity('role_permissions')
@Index(['roleId', 'permId'], { unique: true })
export class RolePermission extends BaseEntity {
  @Column({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @Column({ name: 'perm_id', type: 'bigint' })
  permId: string;
}
