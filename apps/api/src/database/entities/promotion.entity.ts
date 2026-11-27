import { Column, Entity, Index } from 'typeorm';
import { PromotionStatus, PromotionType } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 营销活动主表。具体子活动（特价/预售/套餐等）通过 type 关联各自明细表。 */
@Entity('promotions')
@Index(['tenantId', 'supplierId'])
@Index(['tenantId', 'type', 'status'])
export class Promotion extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'simple-enum', enum: PromotionType })
  type: PromotionType;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** 数值越大优先级越高；同优先级由规则配置的 priority 数组决定顺序 */
  @Column({ type: 'int', default: 0 })
  priority: number;

  /** 互斥组标识：同组内只取优先级最高者 */
  @Column({ name: 'mutex_group', type: 'varchar', length: 64, nullable: true })
  mutexGroup?: string | null;

  @Column({ name: 'start_at', type: 'datetime', nullable: true })
  startAt?: Date | null;

  @Column({ name: 'end_at', type: 'datetime', nullable: true })
  endAt?: Date | null;

  @Column({ type: 'simple-enum', enum: PromotionStatus, default: PromotionStatus.ENABLED })
  status: PromotionStatus;
}
