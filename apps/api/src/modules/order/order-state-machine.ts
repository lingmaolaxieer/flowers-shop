import { BadRequestException } from '@nestjs/common';
import { AfterSaleType, OrderStatus, OrderType } from '@flower/shared';

type Transitions = Partial<Record<OrderStatus, OrderStatus[]>>;

/** 两类订单共用的售后分支入口 */
const AFTER_SALE_BRANCHES: OrderStatus[] = [
  OrderStatus.REFUNDING,
  OrderStatus.PARTIAL_REFUNDED,
  OrderStatus.REPLACEMENT,
];

/** 售后分支收口状态 */
const AFTER_SALE_CLOSE: Transitions = {
  [OrderStatus.REFUNDING]: [OrderStatus.AFTER_SALE_DONE],
  [OrderStatus.PARTIAL_REFUNDED]: [OrderStatus.AFTER_SALE_DONE],
  [OrderStatus.REPLACEMENT]: [OrderStatus.AFTER_SALE_DONE],
  [OrderStatus.AFTER_SALE_DONE]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * 订单状态机：只允许用户定义的合法流转。
 * 顾客单：pending_confirm→confirmed→pending_pay→paid→pending_accept→accepted→picking→shipped→delivering→completed
 * 店家单：pending_confirm→confirmed→pending_pay→paid→picking→shipped→delivering/pending_pickup→completed
 */
export const ORDER_TRANSITIONS: Record<OrderType, Transitions> = {
  [OrderType.CUSTOMER]: {
    [OrderStatus.PENDING_CONFIRM]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PENDING_PAY, OrderStatus.CANCELLED],
    [OrderStatus.PENDING_PAY]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PENDING_ACCEPT, ...AFTER_SALE_BRANCHES],
    [OrderStatus.PENDING_ACCEPT]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED, ...AFTER_SALE_BRANCHES],
    [OrderStatus.ACCEPTED]: [OrderStatus.PICKING, ...AFTER_SALE_BRANCHES],
    [OrderStatus.PICKING]: [OrderStatus.SHIPPED, ...AFTER_SALE_BRANCHES],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERING, OrderStatus.PENDING_PICKUP, ...AFTER_SALE_BRANCHES],
    [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED, ...AFTER_SALE_BRANCHES],
    [OrderStatus.PENDING_PICKUP]: [OrderStatus.COMPLETED, ...AFTER_SALE_BRANCHES],
    [OrderStatus.COMPLETED]: [...AFTER_SALE_BRANCHES],
    ...AFTER_SALE_CLOSE,
  },
  [OrderType.SHOP]: {
    [OrderStatus.PENDING_CONFIRM]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PENDING_PAY, OrderStatus.CANCELLED],
    [OrderStatus.PENDING_PAY]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PICKING, ...AFTER_SALE_BRANCHES],
    [OrderStatus.PICKING]: [OrderStatus.SHIPPED, ...AFTER_SALE_BRANCHES],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERING, OrderStatus.PENDING_PICKUP, ...AFTER_SALE_BRANCHES],
    [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED, ...AFTER_SALE_BRANCHES],
    [OrderStatus.PENDING_PICKUP]: [OrderStatus.COMPLETED, ...AFTER_SALE_BRANCHES],
    [OrderStatus.COMPLETED]: [...AFTER_SALE_BRANCHES],
    ...AFTER_SALE_CLOSE,
  },
};

/** 售后类型对应的订单分支状态 */
export const AFTER_SALE_TARGET: Record<AfterSaleType, OrderStatus> = {
  [AfterSaleType.REFUND]: OrderStatus.REFUNDING,
  [AfterSaleType.PARTIAL_REFUND]: OrderStatus.PARTIAL_REFUNDED,
  [AfterSaleType.REPLACEMENT]: OrderStatus.REPLACEMENT,
  [AfterSaleType.PRICE_DIFF_PAY]: OrderStatus.PARTIAL_REFUNDED,
  [AfterSaleType.PRICE_DIFF_REFUND]: OrderStatus.PARTIAL_REFUNDED,
};

/** 非法流转直接抛 BadRequestException，调用方必须在写库前调用。 */
export function assertOrderTransition(
  orderType: OrderType,
  from: OrderStatus,
  to: OrderStatus,
): void {
  const allowed = ORDER_TRANSITIONS[orderType]?.[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(`非法订单状态流转：${from} -> ${to}（订单类型 ${orderType}）`);
  }
}
