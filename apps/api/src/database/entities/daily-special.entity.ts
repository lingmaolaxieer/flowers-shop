import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 每日特价：命中 SKU 时用 specialPrice 替换单价（单位：分）。 */
@Entity('daily_specials')
@Index(['tenantId', 'supplierId', 'date'])
@Index(['tenantId', 'skuId', 'date'])
export class DailySpecial extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 特价，整数分 */
  @Column({ name: 'special_price', type: 'int' })
  specialPrice: number;

  /** 时段标记（如 morning / all_day），由业务方自行约定 */
  @Column({ type: 'varchar', length: 32, nullable: true })
  slot?: string | null;

  /** 生效日期 yyyy-MM-dd */
  @Column({ type: 'varchar', length: 10 })
  date: string;
}
