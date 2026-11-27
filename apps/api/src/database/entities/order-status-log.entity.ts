import { Column, Entity, Index } from 'typeorm';
import { OrderStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 订单状态流转日志。每次状态变更都必须写一条，便于审计与售后追溯。 */
@Entity('order_status_logs')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
export class OrderStatusLog extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'from_status', type: 'simple-enum', enum: OrderStatus, nullable: true })
  fromStatus?: OrderStatus | null;

  @Column({ name: 'to_status', type: 'simple-enum', enum: OrderStatus })
  toStatus: OrderStatus;

  /** 操作人用户 ID；定时任务自动取消时为 null */
  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;
}
