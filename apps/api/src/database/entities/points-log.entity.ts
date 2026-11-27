import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 积分流水：change 为本次变动值（正数增加、负数扣减）。 */
@Entity('points_logs')
@Index(['tenantId', 'shopId', 'userId'])
@Index(['tenantId', 'refType', 'refNo'])
export class PointsLog extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  /** 变动值：正数增加，负数扣减 */
  @Column({ name: 'change', type: 'int' })
  change: number;

  @Column({ name: 'ref_type', type: 'varchar', length: 32, nullable: true })
  refType?: string | null;

  @Column({ name: 'ref_no', type: 'varchar', length: 64, nullable: true })
  refNo?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark?: string | null;
}
