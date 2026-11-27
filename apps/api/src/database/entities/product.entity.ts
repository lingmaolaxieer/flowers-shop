import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 商品（SPU）。批发商维度，实例化为 SKU 后参与价格与库存。 */
@Entity('products')
@Index(['tenantId', 'supplierId'])
@Index(['tenantId', 'supplierId', 'categoryId'])
export class Product extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'category_id', type: 'bigint' })
  categoryId: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** 品种 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  variety?: string;

  /** 等级 */
  @Column({ type: 'varchar', length: 32, nullable: true })
  grade?: string;

  /** 产地 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  origin?: string;

  /** 规格 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  spec?: string;

  /** 颜色 */
  @Column({ type: 'varchar', length: 32, nullable: true })
  color?: string;

  /** 花期 */
  @Column({ name: 'bloom_period', type: 'varchar', length: 64, nullable: true })
  bloomPeriod?: string;

  /** 是否预售 */
  @Column({ name: 'is_presale', type: 'tinyint', default: 0 })
  isPresale: boolean;

  /** 是否新品 */
  @Column({ name: 'is_new', type: 'tinyint', default: 0 })
  isNew: boolean;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
