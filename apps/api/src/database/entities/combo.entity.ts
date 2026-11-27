import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 套餐：itemsJson 为 [{skuId:string,qty:number}]，comboPrice 为套餐整体价（分）。 */
@Entity('combos')
@Index(['tenantId', 'supplierId', 'status'])
export class Combo extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'items_json', type: 'text' })
  itemsJson: string;

  /** 套餐整体价，整数分 */
  @Column({ name: 'combo_price', type: 'int' })
  comboPrice: number;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
