/**
 * 小程序常量。
 * 【需人工配置】将 BASE_URL 替换为已备案域名 + HTTPS，并在小程序后台配置 request 合法域名。
 * 本地开发者工具可在 project.config.json 中关闭域名校验（urlCheck=false）。
 */
export const BASE_URL = 'https://your-domain.com/api/v1';

export const ROLE_NAMES: Record<string, string> = {
  PLATFORM_ADMIN: '平台运营',
  SUPPLIER_ADMIN: '批发商管理员',
  SUPPLIER_PICKER: '配货员',
  SUPPLIER_SERVICE: '客服',
  SHOP_MANAGER: '店长',
  SHOP_STAFF: '店员',
  CUSTOMER: '顾客',
  DELIVERY_PERSON: '配送员',
};

export const AUDIT_STATUS_NAMES: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

/** 订单状态中文映射（与后端 OrderStatus 枚举一致） */
export const ORDER_STATUS_NAMES: Record<string, string> = {
  pending_confirm: '待确认',
  confirmed: '已确认',
  pending_pay: '待支付',
  paid: '已支付',
  pending_accept: '待接单',
  accepted: '已接单',
  picking: '配货中',
  shipped: '已发货',
  delivering: '配送中',
  pending_pickup: '待自提',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  partial_refunded: '部分退款',
  replacement: '换货中',
  after_sale_done: '售后完成',
};
