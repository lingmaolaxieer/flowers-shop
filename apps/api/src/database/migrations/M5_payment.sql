-- M5 支付 / 结算建表 SQL（与 1700000003000-M5Payment.ts 等价，供人工核对/直接执行）
-- 执行方式：mysql -uroot -p flower_ws < M5_payment.sql
-- 推荐使用 TypeORM migration：npm run migration:run

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  out_trade_no VARCHAR(64) NOT NULL,
  order_id BIGINT NOT NULL,
  amount BIGINT NOT NULL,
  status ENUM('pending','success','failed','closed','refunded') NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(128) NULL,
  paid_at DATETIME NULL,
  raw_callback TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_out_trade_no (out_trade_no),
  KEY idx_payments_tenant_shop (tenant_id, supplier_id, shop_id),
  KEY idx_payments_order (order_id),
  KEY idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_callbacks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  out_trade_no VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  raw_body TEXT NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  processed TINYINT(1) NOT NULL DEFAULT 0,
  error VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_callback_out_event (out_trade_no, event_type),
  KEY idx_callback_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_rules (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  dimension ENUM('order_ratio','delivery_method','shop','category') NOT NULL,
  target_value VARCHAR(64) NULL,
  ratio FLOAT NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  mutex_group VARCHAR(64) NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rules_tenant_supplier (tenant_id, supplier_id, dimension, status),
  KEY idx_rules_mutex (mutex_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settlement_configs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  mode ENUM('profit_share','manual') NOT NULL DEFAULT 'manual',
  delivery_fee_in_commission TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_config_shop (tenant_id, supplier_id, shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profit_share_orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  payment_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  receiver VARCHAR(128) NOT NULL,
  amount BIGINT NOT NULL,
  ratio FLOAT NOT NULL,
  freeze_until DATETIME NULL,
  status ENUM('pending','processing','success','failed','rollback') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_share_tenant_shop (tenant_id, supplier_id, shop_id, status),
  KEY idx_share_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_details (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_no VARCHAR(64) NOT NULL,
  order_id BIGINT NULL,
  order_amount BIGINT NOT NULL,
  delivery_fee BIGINT NOT NULL DEFAULT 0,
  dimension ENUM('order_ratio','delivery_method','shop','category') NOT NULL,
  ratio FLOAT NOT NULL,
  amount BIGINT NOT NULL,
  mode_flag VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_detail_tenant_shop (tenant_id, supplier_id, shop_id),
  KEY idx_detail_order (order_no),
  KEY idx_detail_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settlement_statements (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  statement_no VARCHAR(64) NULL,
  cycle VARCHAR(10) NOT NULL,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  status ENUM('generated','shop_confirmed','supplier_reviewed','exported') NOT NULL DEFAULT 'generated',
  total_amount BIGINT NOT NULL DEFAULT 0,
  commission_amount BIGINT NOT NULL DEFAULT 0,
  order_amount BIGINT NOT NULL DEFAULT 0,
  delivery_fee BIGINT NOT NULL DEFAULT 0,
  refund_amount BIGINT NOT NULL DEFAULT 0,
  net_amount BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_statement_shop_period (tenant_id, supplier_id, shop_id, period_end),
  KEY idx_statement_no (statement_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settlement_statement_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  statement_id BIGINT NOT NULL,
  ref_type VARCHAR(32) NOT NULL,
  ref_no VARCHAR(64) NOT NULL,
  order_no VARCHAR(64) NULL,
  order_amount BIGINT NOT NULL DEFAULT 0,
  delivery_fee BIGINT NOT NULL DEFAULT 0,
  commission_amount BIGINT NOT NULL DEFAULT 0,
  refund_amount BIGINT NOT NULL DEFAULT 0,
  amount BIGINT NOT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_tenant_shop (tenant_id, supplier_id, shop_id),
  KEY idx_item_statement (statement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  title VARCHAR(128) NULL,
  tax_no VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  invoice_no VARCHAR(64) NULL,
  amount BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice_tenant_shop (tenant_id, supplier_id, shop_id),
  KEY idx_invoice_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
