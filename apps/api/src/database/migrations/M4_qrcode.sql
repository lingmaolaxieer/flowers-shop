-- M4 二维码出货 SQL（与 1700000005000-M4Qrcode.ts 等价，供人工核对/直接执行）
-- 执行方式：mysql -uroot -p flower_ws < M4_qrcode.sql
-- 推荐使用 TypeORM migration：npm run migration:run

CREATE TABLE IF NOT EXISTS qr_codes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  order_item_id BIGINT NULL,
  product_id BIGINT NOT NULL,
  unit_seq INT NOT NULL,
  code VARCHAR(191) NOT NULL,
  signature VARCHAR(64) NOT NULL,
  batch VARCHAR(64) NULL,
  weight DECIMAL(10,3) NULL,
  loss DECIMAL(10,3) NULL,
  delivery_person VARCHAR(64) NULL,
  status ENUM('active','scanned','void') NOT NULL DEFAULT 'active',
  scanned_at DATETIME NULL,
  operator_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_qr_code (code),
  KEY idx_qr_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_qr_tenant_order (tenant_id, order_id),
  KEY idx_qr_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scan_records (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  code VARCHAR(191) NOT NULL,
  qr_code_id BIGINT NOT NULL,
  operator_id BIGINT NOT NULL,
  scanned_at DATETIME NOT NULL,
  batch VARCHAR(64) NULL,
  weight DECIMAL(10,3) NULL,
  loss DECIMAL(10,3) NULL,
  delivery_person VARCHAR(64) NULL,
  sign_valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_scan_code (code),
  KEY idx_scan_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
  KEY idx_scan_tenant_shop_scanned (tenant_id, shop_id, scanned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scan_offline_queue (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  batch_id VARCHAR(64) NOT NULL,
  payload TEXT NOT NULL,
  synced TINYINT(1) NOT NULL DEFAULT 0,
  idempotency_key VARCHAR(128) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_offline_idem (tenant_id, idempotency_key),
  KEY idx_offline_tenant_supplier_shop (tenant_id, supplier_id, shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
