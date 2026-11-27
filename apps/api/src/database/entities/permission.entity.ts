import { Column, Entity } from 'typeorm';
import { PermCode } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 权限点（全局字典，不按租户隔离）。 */
@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ name: 'perm_code', type: 'varchar', length: 64, unique: true })
  permCode: PermCode;

  @Column({ type: 'varchar', length: 64 })
  module: string;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  description?: string;
}
