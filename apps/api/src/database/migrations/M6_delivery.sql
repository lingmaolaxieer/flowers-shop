-- M6 配送模块建表脚本（与 1700000004000-M6Delivery.ts 等价）
-- 金额字段统一 BIGINT 存整数分

CREATE TABLE IF NOT EXISTS delivery_areas (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  range_desc VARCHAR(255) NULL,
  base_fee BIGINT NOT NULL,
  free_threshold BIGINT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_da_tenant_supplier (tenant_id, supplier_id),
  KEY idx_da_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_fee_rules (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  method ENUM('same_city','cold_chain','express','pickup','dedicated') NOT NULL,
  weight_fee_per_kg BIGINT NOT NULL,
  amount_surcharge_ratio FLOAT NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dfr_tenant_supplier_method (tenant_id, supplier_id, method),
  KEY idx_dfr_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  method ENUM('same_city','cold_chain','express','pickup','dedicated') NOT NULL,
  tracking_no VARCHAR(64) NULL,
  eta DATETIME NULL,
  status ENUM('pending','picked','delivering','delivered','signed') NOT NULL DEFAULT 'pending',
  weight FLOAT NULL,
  fee_breakdown TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sh_tenant_supplier (tenant_id, supplier_id),
  KEY idx_sh_tenant_status (tenant_id, status),
  KEY idx_sh_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_persons (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  name VARCHAR(64) NULL,
  phone VARCHAR(20) NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dp_tenant_supplier (tenant_id, supplier_id),
  KEY idx_dp_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_status_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  shipment_id BIGINT NOT NULL,
  status ENUM('pending','picked','delivering','delivered','signed') NOT NULL,
  operator_id BIGINT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dsl_tenant_supplier (tenant_id, supplier_id),
  KEY idx_dsl_shipment (shipment_id),
  KEY idx_dsl_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_templates (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  template_key VARCHAR(64) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  template_id VARCHAR(128) NULL,
  content TEXT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nt_tenant_channel (tenant_id, channel),
  KEY idx_nt_tenant_key (tenant_id, template_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_records (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  openid VARCHAR(64) NOT NULL,
  template_id VARCHAR(128) NOT NULL,
  template_key VARCHAR(64) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sr_tenant_user (tenant_id, user_id),
  KEY idx_sr_tenant_key (tenant_id, template_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  channel VARCHAR(20) NOT NULL,
  receiver VARCHAR(64) NOT NULL,
  template_key VARCHAR(64) NOT NULL,
  payload TEXT NULL,
  status VARCHAR(20) NOT NULL,
  error VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nl_tenant_channel (tenant_id, channel),
  KEY idx_nl_tenant_key (tenant_id, template_key),
  KEY idx_nl_receiver (receiver)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
