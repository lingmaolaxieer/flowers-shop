import { Column, Entity, Index } from 'typeorm';
import { DeliveryMethod, OrderStatus, OrderType, PayStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 订单主表。顾客单与店家单共用，分支流转由 orderType 决定。金额为整数分。 */
@Entity('orders')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['tenantId', 'status', 'confirmDeadline'])
@Index(['buyerUserId'])
export class Order extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  /** 时间戳 + 随机数，全局唯一 */
  @Column({ name: 'order_no', type: 'varchar', length: 64, unique: true })
  orderNo: string;

  @Column({ name: 'order_type', type: 'simple-enum', enum: OrderType })
  orderType: OrderType;

  @Column({ name: 'buyer_user_id', type: 'bigint' })
  buyerUserId: string;

  @Column({ type: 'simple-enum', enum: OrderStatus, default: OrderStatus.PENDING_CONFIRM })
  status: OrderStatus;

  @Column({ name: 'pay_status', type: 'simple-enum', enum: PayStatus, default: PayStatus.UNPAID })
  payStatus: PayStatus;

  @Column({ name: 'delivery_method', type: 'simple-enum', enum: DeliveryMethod, nullable: true })
  deliveryMethod?: DeliveryMethod;

  @Column({ name: 'goods_amount', type: 'bigint', default: 0 })
  goodsAmount: number;

  /** 运费，单位：分 */
  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee: number;

  @Column({ name: 'discount_amount', type: 'bigint', default: 0 })
  discountAmount: number;

  @Column({ name: 'payable_amount', type: 'bigint', default: 0 })
  payableAmount: number;

  /** 店家确认超时时间，超时由定时任务自动取消并释放库存锁 */
  @Column({ name: 'confirm_deadline', type: 'datetime', nullable: true })
  confirmDeadline?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark?: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason?: string | null;
}
