import { Column, Entity, Index } from 'typeorm';
import { OrderMessageType } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 订单留言 / 电话 / 客服入口记录。 */
@Entity('order_messages')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['orderId'])
export class OrderMessage extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'sender_id', type: 'bigint' })
  senderId: string;

  @Column({ type: 'simple-enum', enum: OrderMessageType })
  type: OrderMessageType;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  /** 电话入口记录的联系电话 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;
}
