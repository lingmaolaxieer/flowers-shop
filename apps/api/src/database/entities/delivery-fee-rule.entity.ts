import { Column, Entity, Index } from 'typeorm';
import { DeliveryMethod, Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

const fenTransformer = {
  to: (value: number): string => String(value),
  from: (value: string | number): number => Number(value),
};

/** 按配送方式计价的配送费规则（重量费 + 金额加价比例）。 */
@Entity('delivery_fee_rules')
@Index(['tenantId', 'supplierId', 'method'])
@Index(['tenantId', 'status'])
export class DeliveryFeeRule extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'simple-enum', enum: DeliveryMethod })
  method: DeliveryMethod;

  /** 每公斤加价，整数分/kg */
  @Column({ name: 'weight_fee_per_kg', type: 'bigint', transformer: fenTransformer })
  weightFeePerKg: number;

  /** 金额加价比例，如 0.05 表示按订单金额加收 5% */
  @Column({ name: 'amount_surcharge_ratio', type: 'float' })
  amountSurchargeRatio: number;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
