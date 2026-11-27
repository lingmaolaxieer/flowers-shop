import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 报价单：店家向批发商询价的历史快照，可由订单触发生成。 */
@Entity('quotations')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['tenantId', 'supplierId', 'orderId'])
export class Quotation extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'valid' })
  status: string;

  @Column({ name: 'modifier_id', type: 'bigint', nullable: true })
  modifierId?: string | null;
}
