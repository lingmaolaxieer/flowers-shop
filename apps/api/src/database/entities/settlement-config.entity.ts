import { Column, Entity, Index } from 'typeorm';
import { SettlementMode } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 逐花店结算配置：分账 / 人工结算，以及配送费是否参与抽成。 */
@Entity('settlement_configs')
@Index(['tenantId', 'supplierId', 'shopId'], { unique: true })
export class SettlementConfig extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ type: 'simple-enum', enum: SettlementMode, default: SettlementMode.MANUAL })
  mode: SettlementMode;

  /** 配送费是否计入抽成基数（逐花店配置） */
  @Column({ name: 'delivery_fee_in_commission', type: 'boolean', default: false })
  deliveryFeeInCommission: boolean;
}
