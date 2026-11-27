// ===== M1 账号权限 =====
export * from './base.entity';
export * from './tenant.entity';
export * from './supplier.entity';
export * from './shop.entity';
export * from './user.entity';
export * from './user-identity.entity';
export * from './role.entity';
export * from './permission.entity';
export * from './role-permission.entity';
export * from './user-role-binding.entity';
export * from './shop-audit.entity';
export * from './system-config.entity';

// ===== M2 商品 / 价格 / 库存 =====
export * from './product-category.entity';
export * from './product.entity';
export * from './product-sku.entity';
export * from './product-media.entity';
export * from './price-daily-quote.entity';
export * from './shop-level-price.entity';
export * from './shop-specific-price.entity';
export * from './tier-price.entity';
export * from './quotation.entity';
export * from './quotation-item.entity';
export * from './inventory.entity';
export * from './inventory-lock.entity';
export * from './inventory-log.entity';
export * from './loss-record.entity';
export * from './stock-alert.entity';

// ===== M3 订单 =====
export * from './order.entity';
export * from './order-item.entity';
export * from './order-status-log.entity';
export * from './order-message.entity';
export * from './order-address.entity';
export * from './refund.entity';
export * from './after-sale.entity';

// ===== M4 二维码出货 =====
export * from './qr-code.entity';
export * from './scan-record.entity';
export * from './scan-offline-queue.entity';

// ===== M5 支付 / 结算 =====
export * from './payment.entity';
export * from './payment-callback.entity';
export * from './commission-rule.entity';
export * from './settlement-config.entity';
export * from './profit-share-order.entity';
export * from './commission-detail.entity';
export * from './settlement-statement.entity';
export * from './settlement-statement-item.entity';
export * from './invoice.entity';

// ===== M6 配送 / 通知 =====
export * from './delivery-area.entity';
export * from './delivery-fee-rule.entity';
export * from './shipment.entity';
export * from './delivery-person.entity';
export * from './delivery-status-log.entity';
export * from './notification-template.entity';
export * from './subscription-record.entity';
export * from './notification-log.entity';

// ===== M7 营销 =====
export * from './promotion.entity';
export * from './promotion-rule.entity';
export * from './daily-special.entity';
export * from './presale.entity';
export * from './combo.entity';
export * from './coupon.entity';
export * from './user-coupon.entity';
export * from './discount-rule.entity';
export * from './member-price.entity';
export * from './points-account.entity';
export * from './points-log.entity';
export * from './tier-discount-rule.entity';

// ===== M8 报表 / 系统 =====
export * from './report-definition.entity';
export * from './report-export.entity';
export * from './webhook-subscription.entity';
export * from './audit-log.entity';
export * from './idempotency-key.entity';
export * from './file.entity';
export * from './scheduled-job.entity';
