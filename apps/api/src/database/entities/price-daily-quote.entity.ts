import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 批发商每日报价（按时段可多条）。price 为批发价，单位：分，仅价格域可见。 */
@Entity('price_daily_quotes')
@Index(['tenantId', 'supplierId', 'skuId', 'effectiveDate'])
export class PriceDailyQuote extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 批发价，单位：分 */
  @Column({ type: 'bigint' })
  price: number;

  /** 时段标识，如 'morning' / 'all_day'，可空 */
  @Column({ name: 'time_slot', type: 'varchar', length: 32, nullable: true })
  timeSlot?: string | null;

  /** 生效日期，格式 '2026-11-27' */
  @Column({ name: 'effective_date', type: 'varchar', length: 10 })
  effectiveDate: string;
}
