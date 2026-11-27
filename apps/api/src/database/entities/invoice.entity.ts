import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 发票申请与开票结果。 */
@Entity('invoices')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
export class Invoice extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  title?: string | null;

  @Column({ name: 'tax_no', type: 'varchar', length: 64, nullable: true })
  taxNo?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ name: 'invoice_no', type: 'varchar', length: 64, nullable: true })
  invoiceNo?: string | null;

  @Column({ type: 'bigint' })
  amount: number;
}
