import { Column, Entity, Index } from 'typeorm';
import { StockAlertStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 库存预警：缺货/超卖尝试触发，须人工确认，禁止自动回补库存。 */
@Entity('stock_alerts')
@Index(['tenantId', 'supplierId', 'shopId', 'status'])
@Index(['tenantId', 'supplierId', 'refType', 'refId'])
export class StockAlert extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  /** 触发来源类型：如 'sku' / 'order' */
  @Column({ name: 'ref_type', type: 'varchar', length: 32 })
  refType: string;

  /** 触发来源 ID（bigint 以字符串承载） */
  @Column({ name: 'ref_id', type: 'bigint' })
  refId: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'simple-enum', enum: StockAlertStatus, default: StockAlertStatus.PENDING })
  status: StockAlertStatus;

  @Column({ name: 'confirmer_id', type: 'bigint', nullable: true })
  confirmerId?: string | null;
}
