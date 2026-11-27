import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 报价单明细。price 为当时命中的批发价，单位：分。 */
@Entity('quotation_items')
@Index(['tenantId', 'supplierId', 'quotationId'])
export class QuotationItem extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'quotation_id', type: 'bigint' })
  quotationId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  @Column({ type: 'int' })
  qty: number;

  /** 命中单价，单位：分 */
  @Column({ type: 'bigint' })
  price: number;
}
