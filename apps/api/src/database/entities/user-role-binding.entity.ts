import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/**
 * 子账号绑定：店长/店员、批发商管理员/配货员/客服。
 * 与 user_identities 的区别：binding 用于后台显式分配角色，identity 用于前端身份切换。
 */
@Entity('user_role_bindings')
@Index(['userId'])
@Index(['tenantId', 'roleId'])
export class UserRoleBinding extends BaseEntity {
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint', nullable: true })
  supplierId?: string;

  @Column({ name: 'shop_id', type: 'bigint', nullable: true })
  shopId?: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
