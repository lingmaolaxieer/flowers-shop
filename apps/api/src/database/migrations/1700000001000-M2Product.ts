import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M2：商品、价格体系、店家独立库存共 15 张表。
 * 全表带 tenant_id / supplier_id；花店维度带 shop_id；金额一律 BIGINT 存整数分。
 * 顾客端只读商品主表/SKU 零售价与媒体，批发价只存在于价格域。
 */
export class M2Product1700000001000 implements MigrationInterface {
  name = 'M2Product1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    const audit = `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;

    // 1. 商品类目
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        name VARCHAR(64) NOT NULL,
        parent_id BIGINT NULL,
        sort INT NOT NULL DEFAULT 0,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_pc_tenant_supplier (tenant_id, supplier_id),
        KEY idx_pc_tenant_parent (tenant_id, supplier_id, parent_id)
      ) ${charset}
    `);

    // 2. 商品 SPU
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        category_id BIGINT NOT NULL,
        name VARCHAR(128) NOT NULL,
        variety VARCHAR(64) NULL,
        grade VARCHAR(32) NULL,
        origin VARCHAR(64) NULL,
        spec VARCHAR(64) NULL,
        color VARCHAR(32) NULL,
        bloom_period VARCHAR(64) NULL,
        is_presale TINYINT NOT NULL DEFAULT 0,
        is_new TINYINT NOT NULL DEFAULT 0,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_p_tenant_supplier (tenant_id, supplier_id),
        KEY idx_p_tenant_category (tenant_id, supplier_id, category_id)
      ) ${charset}
    `);

    // 3. 商品 SKU（retail_price 为顾客零售价，单位：分）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_skus (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        product_id BIGINT NOT NULL,
        unit ENUM('扎','枝','束','箱') NOT NULL,
        barcode VARCHAR(64) NULL,
        retail_price BIGINT NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_ps_tenant_supplier (tenant_id, supplier_id),
        KEY idx_ps_product (tenant_id, supplier_id, product_id)
      ) ${charset}
    `);

    // 4. 商品图片/视频
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_media (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        product_id BIGINT NOT NULL,
        url VARCHAR(512) NOT NULL,
        type ENUM('image','video') NOT NULL DEFAULT 'image',
        sort INT NOT NULL DEFAULT 0,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_pm_product (tenant_id, supplier_id, product_id)
      ) ${charset}
    `);

    // 5. 每日报价（批发价，单位：分）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS price_daily_quotes (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        price BIGINT NOT NULL,
        time_slot VARCHAR(32) NULL,
        effective_date VARCHAR(10) NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_pdq_tenant_sku_date (tenant_id, supplier_id, sku_id, effective_date)
      ) ${charset}
    `);

    // 6. 店家等级价
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shop_level_prices (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        level VARCHAR(32) NOT NULL,
        price BIGINT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_slp_tenant_sku_level (tenant_id, supplier_id, sku_id, level)
      ) ${charset}
    `);

    // 7. 一店一价
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shop_specific_prices (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        price BIGINT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_ssp_tenant_shop_sku (tenant_id, supplier_id, shop_id, sku_id)
      ) ${charset}
    `);

    // 8. 阶梯价
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tier_prices (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        min_qty INT NOT NULL,
        price BIGINT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_tp_tenant_sku_qty (tenant_id, supplier_id, sku_id, min_qty)
      ) ${charset}
    `);

    // 9. 报价单
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        order_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'valid',
        modifier_id BIGINT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_q_tenant_shop (tenant_id, supplier_id, shop_id),
        KEY idx_q_tenant_order (tenant_id, supplier_id, order_id)
      ) ${charset}
    `);

    // 10. 报价单明细
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quotation_items (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        quotation_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        qty INT NOT NULL,
        price BIGINT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_qi_quotation (tenant_id, supplier_id, quotation_id)
      ) ${charset}
    `);

    // 11. 店家独立库存
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventories (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        total INT NOT NULL DEFAULT 0,
        available INT NOT NULL DEFAULT 0,
        locked INT NOT NULL DEFAULT 0,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_inv_shop_sku (tenant_id, supplier_id, shop_id, sku_id)
      ) ${charset}
    `);

    // 12. 库存锁单
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_locks (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        order_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        qty INT NOT NULL,
        expire_at DATETIME NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_il_shop_order (tenant_id, supplier_id, shop_id, order_id),
        KEY idx_il_sku_order (tenant_id, supplier_id, sku_id, order_id)
      ) ${charset}
    `);

    // 13. 库存流水
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        change_type ENUM('purchase_in','order_lock','order_unlock','order_deduct','loss','manual_adjust','backfill') NOT NULL,
        qty INT NOT NULL,
        before_qty INT NOT NULL,
        after_qty INT NOT NULL,
        ref_no VARCHAR(64) NULL,
        operator_id BIGINT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_ilog_shop_sku (tenant_id, supplier_id, shop_id, sku_id),
        KEY idx_ilog_ref (tenant_id, supplier_id, ref_no)
      ) ${charset}
    `);

    // 14. 损耗登记（只减库存，不自动回补）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loss_records (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        qty INT NOT NULL,
        reason VARCHAR(255) NOT NULL,
        operator_id BIGINT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_lr_shop_sku (tenant_id, supplier_id, shop_id, sku_id)
      ) ${charset}
    `);

    // 15. 库存预警（人工确认，禁止自动回补）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        ref_type VARCHAR(32) NOT NULL,
        ref_id BIGINT NOT NULL,
        qty INT NOT NULL,
        status ENUM('pending','confirmed','ignored') NOT NULL DEFAULT 'pending',
        confirmer_id BIGINT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_sa_tenant_shop_status (tenant_id, supplier_id, shop_id, status),
        KEY idx_sa_ref (tenant_id, supplier_id, ref_type, ref_id)
      ) ${charset}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'stock_alerts',
      'loss_records',
      'inventory_logs',
      'inventory_locks',
      'inventories',
      'quotation_items',
      'quotations',
      'tier_prices',
      'shop_specific_prices',
      'shop_level_prices',
      'price_daily_quotes',
      'product_media',
      'product_skus',
      'products',
      'product_categories',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
}
