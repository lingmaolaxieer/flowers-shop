import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 满减：订单金额（分）满 threshold 减 discount（分）。 */
@Entity('discount_rules')
@Index(['tenantId', 'supplierId', 'status'])
export class DiscountRule extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  /** 门槛，整数分 */
  @Column({ type: 'int' })
  threshold: number;

  /** 立减，整数分 */
  @Column({ type: 'int' })
  discount: number;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
