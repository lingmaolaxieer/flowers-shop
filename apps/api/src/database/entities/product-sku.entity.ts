import { Column, Entity, Index } from 'typeorm';
import { ProductUnit, Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 商品 SKU。retailPrice 为顾客零售价（BIGINT 整数分），批发价不在此表。 */
@Entity('product_skus')
@Index(['tenantId', 'supplierId'])
@Index(['tenantId', 'supplierId', 'productId'])
export class ProductSku extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ type: 'simple-enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode?: string | null;

  /** 顾客零售价，单位：分 */
  @Column({ name: 'retail_price', type: 'bigint' })
  retailPrice: number;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
