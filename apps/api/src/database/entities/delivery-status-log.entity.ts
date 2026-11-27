import { Column, Entity, Index } from 'typeorm';
import { ShipmentStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 配送状态流水：每次配送员更新状态都留痕，便于对账与客诉追溯。 */
@Entity('delivery_status_logs')
@Index(['tenantId', 'supplierId'])
@Index(['shipmentId'])
@Index(['tenantId', 'status'])
export class DeliveryStatusLog extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @Column({ type: 'simple-enum', enum: ShipmentStatus })
  status: ShipmentStatus;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string;
}
