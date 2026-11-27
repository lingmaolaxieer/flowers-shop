import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M4 二维码出货：二维码、扫码流水、离线同步队列三张表。
 * code 唯一索引是防重复扫码的关键约束；idempotency_key 在租户内唯一保证离线同步幂等。
 */
export class M4Qrcode1700000005000 implements MigrationInterface {
  name = 'M4Qrcode1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    const audit = `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;

    // 1. 二维码（一单位一码）
    await queryRunner.query(`
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
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_qr_code (code),
        KEY idx_qr_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_qr_tenant_order (tenant_id, order_id),
        KEY idx_qr_tenant_status (tenant_id, status)
      ) ${charset}
    `);

    // 2. 扫码流水（code 唯一 = 防重复扫码）
    await queryRunner.query(`
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
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_scan_code (code),
        KEY idx_scan_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_scan_tenant_shop_scanned (tenant_id, shop_id, scanned_at)
      ) ${charset}
    `);

    // 3. 离线扫码待同步队列
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scan_offline_queue (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        batch_id VARCHAR(64) NOT NULL,
        payload TEXT NOT NULL,
        synced TINYINT(1) NOT NULL DEFAULT 0,
        idempotency_key VARCHAR(128) NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_offline_idem (tenant_id, idempotency_key),
        KEY idx_offline_tenant_supplier_shop (tenant_id, supplier_id, shop_id)
      ) ${charset}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ['scan_offline_queue', 'scan_records', 'qr_codes'];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
}
