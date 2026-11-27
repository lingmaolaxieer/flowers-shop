import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 金额以整数分存储：bigint 列 ↔ JS number 互转，避免 mysql 驱动返回字符串。 */
const fenTransformer = {
  to: (value: number): string => String(value),
  from: (value: string | number): number => Number(value),
};

/** 配送区域：按批发商配置基础费与满额免配门槛。 */
@Entity('delivery_areas')
@Index(['tenantId', 'supplierId'])
@Index(['tenantId', 'status'])
export class DeliveryArea extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'range_desc', type: 'varchar', length: 255, nullable: true })
  rangeDesc?: string;

  /** 基础配送费，整数分 */
  @Column({ name: 'base_fee', type: 'bigint', transformer: fenTransformer })
  baseFee: number;

  /** 满额免配门槛，整数分；orderAmount >= 该值时配送费为 0 */
  @Column({ name: 'free_threshold', type: 'bigint', transformer: fenTransformer, nullable: true })
  freeThreshold?: number;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
