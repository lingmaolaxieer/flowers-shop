import { Column, Entity, Index } from 'typeorm';
import { CommissionDimension, Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/**
 * 抽成规则。
 * priority 越大越优先；同一 mutexGroup 内只命中优先级最高的一条，不同组可叠加。
 * targetValue 依 dimension 解释为配送方式 / 花店ID / 类目ID，空串表示通配。
 */
@Entity('commission_rules')
@Index(['tenantId', 'supplierId', 'dimension', 'status'])
@Index(['mutexGroup'])
export class CommissionRule extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'simple-enum', enum: CommissionDimension })
  dimension: CommissionDimension;

  @Column({ name: 'target_value', type: 'varchar', length: 64, nullable: true })
  targetValue?: string | null;

  /** 抽成比例 0~1 */
  @Column({ type: 'float' })
  ratio: number;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'mutex_group', type: 'varchar', length: 64, nullable: true })
  mutexGroup?: string | null;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
