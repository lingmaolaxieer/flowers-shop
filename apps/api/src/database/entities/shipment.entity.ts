import { Column, Entity, Index } from 'typeorm';
import { DeliveryMethod, ShipmentStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 运单：快递/冷链运单号由人工录入，系统不对接第三方物流接口。 */
@Entity('shipments')
@Index(['tenantId', 'supplierId'])
@Index(['tenantId', 'status'])
@Index(['orderId'])
export class Shipment extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ type: 'simple-enum', enum: DeliveryMethod })
  method: DeliveryMethod;

  @Column({ name: 'tracking_no', type: 'varchar', length: 64, nullable: true })
  trackingNo?: string;

  @Column({ type: 'datetime', nullable: true })
  eta?: Date;

  @Column({ type: 'simple-enum', enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  /** 重量，单位 kg */
  @Column({ type: 'float', nullable: true })
  weight?: number;

  /** 配送费明细（JSON 文本），结构见 DeliveryService.quoteFee 返回值 */
  @Column({ name: 'fee_breakdown', type: 'text', nullable: true })
  feeBreakdown?: string;
}
