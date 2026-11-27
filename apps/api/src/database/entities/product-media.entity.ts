import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 商品图片/视频素材。 */
@Entity('product_media')
@Index(['tenantId', 'supplierId', 'productId'])
export class ProductMedia extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ type: 'simple-enum', enum: ['image', 'video'], default: 'image' })
  type: 'image' | 'video';

  @Column({ type: 'int', default: 0 })
  sort: number;
}
