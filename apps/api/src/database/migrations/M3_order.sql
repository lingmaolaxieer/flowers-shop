-- M3 订单 SQL（与 1700000002000-M3Order.ts 等价，供人工核对/直接执行）
-- 执行方式：mysql -uroot -p flower_ws < M3_order.sql
-- 推荐使用 TypeORM migration：npm run migration:run

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_no VARCHAR(64) NOT NULL,
  order_type ENUM('customer','shop') NOT NULL,
  buyer_user_id BIGINT NOT NULL,
  status ENUM('pending_confirm','confirmed','pending_pay','paid','pending_accept','accepted','picking','shipped','delivering','pending_pickup','completed','cancelled','refunding','partial_refunded','replacement','after_sale_done') NOT NULL DEFAULT 'pending_confirm',
  pay_status ENUM('unpaid','paid','refunding','refunded','partial_refunded') NOT NULL DEFAULT 'unpaid',
  delivery_method ENUM('same_city','cold_chain','express','pickup','dedicated') NULL,
  goods_amount BIGINT NOT NULL DEFAULT 0,
  delivery_fee BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  payable_amount BIGINT NOT NULL DEFAULT 0,
  confirm_deadline DATETIME NULL,
  remark VARCHAR(255) NULL,
  cancel_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_orders_order_no (order_no),
  KEY idx_orders_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_orders_tenant_status_deadline (tenant_id, status, confirm_deadline),
  KEY idx_orders_buyer (buyer_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  sku_id BIGINT NOT NULL,
  product_name VARCHAR(128) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  qty INT NOT NULL,
  retail_price BIGINT NOT NULL,
  wholesale_price BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_oi_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_oi_order (order_id),
  KEY idx_oi_sku (sku_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  from_status ENUM('pending_confirm','confirmed','pending_pay','paid','pending_accept','accepted','picking','shipped','delivering','pending_pickup','completed','cancelled','refunding','partial_refunded','replacement','after_sale_done') NULL,
  to_status ENUM('pending_confirm','confirmed','pending_pay','paid','pending_accept','accepted','picking','shipped','delivering','pending_pickup','completed','cancelled','refunding','partial_refunded','replacement','after_sale_done') NOT NULL,
  operator_id BIGINT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osl_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_osl_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_messages (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  type ENUM('text','phone','service') NOT NULL,
  content TEXT NULL,
  phone VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_om_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_om_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_addresses (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  receiver VARCHAR(64) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  type VARCHAR(16) NOT NULL,
  area_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_oa_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_oa_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  refund_no VARCHAR(64) NOT NULL,
  order_id BIGINT NOT NULL,
  type ENUM('full','partial') NOT NULL,
  amount BIGINT NOT NULL,
  reason VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  inventory_status VARCHAR(32) NULL,
  profit_share_rollback_status VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refunds_refund_no (refund_no),
  KEY idx_refunds_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_refunds_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS after_sales (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  type ENUM('refund','partial_refund','replacement','price_diff_pay','price_diff_refund') NOT NULL,
  price_diff BIGINT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  operator_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_as_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_as_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
