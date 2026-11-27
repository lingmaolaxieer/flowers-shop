import { Order } from '../../../database/entities/order.entity';
import { OrderItem } from '../../../database/entities/order-item.entity';

/** 顾客端订单明细 VO：白名单，绝不包含 wholesalePrice。 */
export class OrderItemCustomerVo {
  id: string;
  skuId: string;
  productName: string;
  unit: string;
  qty: number;
  retailPrice: number;
}

/** 顾客端订单 VO：白名单，绝不返回批发价/成本/抽成字段。 */
export class OrderCustomerVo {
  id: string;
  orderNo: string;
  orderType: Order['orderType'];
  status: Order['status'];
  payStatus: Order['payStatus'];
  deliveryMethod?: Order['deliveryMethod'];
  goodsAmount: number;
  deliveryFee: number;
  discountAmount: number;
  payableAmount: number;
  confirmDeadline?: Date | null;
  remark?: string | null;
  cancelReason?: string | null;
  createdAt: Date;
  items: OrderItemCustomerVo[];
}

/** 店家/后台订单明细 VO：可包含批发价。 */
export class OrderItemAdminVo {
  id: string;
  skuId: string;
  productName: string;
  unit: string;
  qty: number;
  retailPrice: number;
  wholesalePrice: number;
}

export class OrderAdminVo {
  id: string;
  orderNo: string;
  orderType: Order['orderType'];
  tenantId: string;
  supplierId: string;
  shopId: string;
  buyerUserId: string;
  status: Order['status'];
  payStatus: Order['payStatus'];
  deliveryMethod?: Order['deliveryMethod'];
  goodsAmount: number;
  deliveryFee: number;
  discountAmount: number;
  payableAmount: number;
  confirmDeadline?: Date | null;
  remark?: string | null;
  cancelReason?: string | null;
  createdAt: Date;
  items: OrderItemAdminVo[];
}

export function toCustomerVo(order: Order, items: OrderItem[]): OrderCustomerVo {
  const vo = Object.assign(new OrderCustomerVo(), {
    id: order.id,
    orderNo: order.orderNo,
    orderType: order.orderType,
    status: order.status,
    payStatus: order.payStatus,
    deliveryMethod: order.deliveryMethod ?? null,
    goodsAmount: order.goodsAmount,
    deliveryFee: order.deliveryFee,
    discountAmount: order.discountAmount,
    payableAmount: order.payableAmount,
    confirmDeadline: order.confirmDeadline ?? null,
    remark: order.remark ?? null,
    cancelReason: order.cancelReason ?? null,
    createdAt: order.createdAt,
  });
  vo.items = items.map((item) =>
    Object.assign(new OrderItemCustomerVo(), {
      id: item.id,
      skuId: item.skuId,
      productName: item.productName,
      unit: item.unit,
      qty: item.qty,
      retailPrice: item.retailPrice,
    }),
  );
  return vo;
}

export function toAdminVo(order: Order, items: OrderItem[]): OrderAdminVo {
  const vo = Object.assign(new OrderAdminVo(), {
    id: order.id,
    orderNo: order.orderNo,
    orderType: order.orderType,
    tenantId: order.tenantId,
    supplierId: order.supplierId,
    shopId: order.shopId,
    buyerUserId: order.buyerUserId,
    status: order.status,
    payStatus: order.payStatus,
    deliveryMethod: order.deliveryMethod ?? null,
    goodsAmount: order.goodsAmount,
    deliveryFee: order.deliveryFee,
    discountAmount: order.discountAmount,
    payableAmount: order.payableAmount,
    confirmDeadline: order.confirmDeadline ?? null,
    remark: order.remark ?? null,
    cancelReason: order.cancelReason ?? null,
    createdAt: order.createdAt,
  });
  vo.items = items.map((item) =>
    Object.assign(new OrderItemAdminVo(), {
      id: item.id,
      skuId: item.skuId,
      productName: item.productName,
      unit: item.unit,
      qty: item.qty,
      retailPrice: item.retailPrice,
      wholesalePrice: item.wholesalePrice,
    }),
  );
  return vo;
}
