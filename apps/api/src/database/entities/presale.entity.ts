import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 预售定金尾款：定金与尾款均为整数分，下单仅收定金，尾款由后续流程收取。 */
@Entity('presales')
@Index(['tenantId', 'supplierId', 'status'])
@Index(['tenantId', 'skuId'])
export class Presale extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId: string;

  /** 定金，整数分 */
  @Column({ type: 'int' })
  deposit: number;

  /** 尾款，整数分 */
  @Column({ type: 'int' })
  balance: number;

  @Column({ name: 'start_at', type: 'datetime' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'datetime' })
  endAt: Date;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
