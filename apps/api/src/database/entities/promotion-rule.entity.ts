import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/**
 * 叠加/互斥/优先级配置。
 * ruleJson 结构见 marketing.service.ts 顶部注释：
 * { stackable: PromotionType[], mutexGroups: {name,types}[], priority: PromotionType[] }
 */
@Entity('promotion_rules')
@Index(['tenantId', 'supplierId', 'status'])
export class PromotionRule extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'rule_json', type: 'text' })
  ruleJson: string;

  /** 数值越大越优先；多条启用配置时取该值最大者 */
  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
