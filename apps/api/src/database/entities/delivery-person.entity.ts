import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 配送员：绑定系统用户，由批发商维护。 */
@Entity('delivery_persons')
@Index(['tenantId', 'supplierId'])
@Index(['userId'])
export class DeliveryPerson extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
