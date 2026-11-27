/**
 * 全端共享枚举（后端 / 小程序 / Web 管理端）
 * 修改此处后需重新构建 @flower/shared 并同步小程序 constants。
 */

/** 租户类型：平台运营 / 批发商 */
export enum TenantType {
  PLATFORM = 'platform',
  SUPPLIER = 'supplier',
}

/** 通用启用状态：1 启用，0 停用 */
export enum Status {
  ENABLED = 1,
  DISABLED = 0,
}

/** 审核状态：店家入驻、子账号审批等 */
export enum AuditStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** 预置角色码。同一微信用户可拥有多个身份，登录后可切换。 */
export enum RoleCode {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  SUPPLIER_ADMIN = 'SUPPLIER_ADMIN',
  SUPPLIER_PICKER = 'SUPPLIER_PICKER',
  SUPPLIER_SERVICE = 'SUPPLIER_SERVICE',
  SHOP_MANAGER = 'SHOP_MANAGER',
  SHOP_STAFF = 'SHOP_STAFF',
  CUSTOMER = 'CUSTOMER',
  DELIVERY_PERSON = 'DELIVERY_PERSON',
}

/** 身份作用域 */
export enum IdentityScope {
  PLATFORM = 'platform',
  SUPPLIER = 'supplier',
  SHOP = 'shop',
  PERSONAL = 'personal',
}

/**
 * 权限点。M1 一次性全量定义，后续里程碑逐步启用。
 * 顾客端不持有任何 :write / 批发价相关权限。
 */
export enum PermCode {
  PRODUCT_READ = 'product:read',
  PRODUCT_WRITE = 'product:write',
  PRICE_READ = 'price:read',
  PRICE_WRITE = 'price:write',
  INVENTORY_READ = 'inventory:read',
  INVENTORY_WRITE = 'inventory:write',
  ORDER_READ = 'order:read',
  ORDER_WRITE = 'order:write',
  FINANCE_READ = 'finance:read',
  FINANCE_WRITE = 'finance:write',
  SERVICE_READ = 'service:read',
  SERVICE_WRITE = 'service:write',
  QR_PRINT = 'qr:print',
  EXPORT_READ = 'export:read',
  AUDIT_READ = 'audit:read',
  AUDIT_WRITE = 'audit:write',
  ROLE_READ = 'role:read',
  ROLE_WRITE = 'role:write',
  SUPPLIER_READ = 'supplier:read',
  SUPPLIER_WRITE = 'supplier:write',
}

// ==================== M2 商品 / 价格 / 库存 ====================

/** 商品计量单位 */
export enum ProductUnit {
  BUNCH = '扎',
  STEM = '枝',
  BOUQUET = '束',
  BOX = '箱',
}

/** 库存流水变更类型 */
export enum InventoryChangeType {
  PURCHASE_IN = 'purchase_in',
  ORDER_LOCK = 'order_lock',
  ORDER_UNLOCK = 'order_unlock',
  ORDER_DEDUCT = 'order_deduct',
  LOSS = 'loss',
  MANUAL_ADJUST = 'manual_adjust',
  BACKFILL = 'backfill',
}

/** 库存提醒状态（人工确认，不自动回补） */
export enum StockAlertStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IGNORED = 'ignored',
}

// ==================== M3 订单 ====================

/** 订单类型 */
export enum OrderType {
  CUSTOMER = 'customer',
  SHOP = 'shop',
}

/** 订单状态机。顾客单与店家单共用主状态，分支流转由订单类型决定。 */
export enum OrderStatus {
  PENDING_CONFIRM = 'pending_confirm',
  CONFIRMED = 'confirmed',
  PENDING_PAY = 'pending_pay',
  PAID = 'paid',
  PENDING_ACCEPT = 'pending_accept',
  ACCEPTED = 'accepted',
  PICKING = 'picking',
  SHIPPED = 'shipped',
  DELIVERING = 'delivering',
  PENDING_PICKUP = 'pending_pickup',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDING = 'refunding',
  PARTIAL_REFUNDED = 'partial_refunded',
  REPLACEMENT = 'replacement',
  AFTER_SALE_DONE = 'after_sale_done',
}

/** 支付状态 */
export enum PayStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDING = 'refunding',
  REFUNDED = 'refunded',
  PARTIAL_REFUNDED = 'partial_refunded',
}

/** 订单留言类型 */
export enum OrderMessageType {
  TEXT = 'text',
  PHONE = 'phone',
  SERVICE = 'service',
}

/** 售后类型 */
export enum AfterSaleType {
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
  REPLACEMENT = 'replacement',
  PRICE_DIFF_PAY = 'price_diff_pay',
  PRICE_DIFF_REFUND = 'price_diff_refund',
}

// ==================== M4 二维码出货 ====================

export enum QrCodeStatus {
  ACTIVE = 'active',
  SCANNED = 'scanned',
  VOID = 'void',
}

// ==================== M5 支付 / 结算 ====================

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CLOSED = 'closed',
  REFUNDED = 'refunded',
}

/** 抽成维度 */
export enum CommissionDimension {
  ORDER_RATIO = 'order_ratio',
  DELIVERY_METHOD = 'delivery_method',
  SHOP = 'shop',
  CATEGORY = 'category',
}

/** 逐花店结算模式 */
export enum SettlementMode {
  /** 微信分账：抽成 ≤30%，按金额分账，有冻结期 */
  PROFIT_SHARE = 'profit_share',
  /** 人工结算：资金先入批发商，周期对账单线下结算，抽成不受30%限制 */
  MANUAL = 'manual',
}

export enum ProfitShareStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLBACK = 'rollback',
}

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
}

// ==================== M6 配送 ====================

export enum DeliveryMethod {
  SAME_CITY = 'same_city',
  COLD_CHAIN = 'cold_chain',
  EXPRESS = 'express',
  PICKUP = 'pickup',
  DEDICATED = 'dedicated',
}

export enum ShipmentStatus {
  PENDING = 'pending',
  PICKED = 'picked',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  SIGNED = 'signed',
}

// ==================== M7 营销 ====================

export enum PromotionType {
  DAILY_SPECIAL = 'daily_special',
  PRESALE = 'presale',
  COMBO = 'combo',
  COUPON = 'coupon',
  DISCOUNT = 'discount',
  TIER_DISCOUNT = 'tier_discount',
  MEMBER_PRICE = 'member_price',
  POINTS = 'points',
}

export enum PromotionStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  SCHEDULED = 'scheduled',
  ENDED = 'ended',
}

// ==================== M8 对账 / 报表 ====================

export enum StatementStatus {
  GENERATED = 'generated',
  SHOP_CONFIRMED = 'shop_confirmed',
  SUPPLIER_REVIEWED = 'supplier_reviewed',
  EXPORTED = 'exported',
}

export enum ReportType {
  SALES = 'sales',
  INVENTORY_LOSS = 'inventory_loss',
  COMMISSION_DETAIL = 'commission_detail',
  SETTLEMENT_STATEMENT = 'settlement_statement',
  DELIVERY_FEE = 'delivery_fee',
  REFUND_DETAIL = 'refund_detail',
  PRODUCT_TURNOVER = 'product_turnover',
  PRESALE_STATS = 'presale_stats',
}
