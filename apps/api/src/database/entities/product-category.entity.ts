import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 商品类目（批发商自定义树形结构，parentId 为空表示一级类目）。 */
@Entity('product_categories')
@Index(['tenantId', 'supplierId'])
@Index(['tenantId', 'supplierId', 'parentId'])
export class ProductCategory extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId?: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
