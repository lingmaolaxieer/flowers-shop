import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 会员价：按会员等级 level 命中 SKU 专属价（分）。 */
@Entity('member_prices')
@Index(['tenantId', 'supplierId', 'level', 'skuId'])
export class MemberPrice extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  /** 会员等级编码，如 normal / silver / gold */
  @Column({ type: 'varchar', length: 32 })
  level: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 会员价，整数分 */
  @Column({ type: 'int' })
  price: number;
}
