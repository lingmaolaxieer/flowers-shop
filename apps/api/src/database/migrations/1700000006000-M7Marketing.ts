import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M7 营销 MVP：活动主表、规则配置、特价/预售/套餐/优惠券/满减/会员价/积分/起批量，共 12 张表。
 * 金额一律 BIGINT 存整数分；实体中金额字段用 number 承载。
 */
export class M7Marketing1700000006000 implements MigrationInterface {
  name = 'M7Marketing1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    const audit = `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;

    // 1. 活动主表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        type ENUM('daily_special','presale','combo','coupon','discount','tier_discount','member_price','points') NOT NULL,
        name VARCHAR(128) NOT NULL,
        priority INT NOT NULL DEFAULT 0,
        mutex_group VARCHAR(64) NULL,
        start_at DATETIME NULL,
        end_at DATETIME NULL,
        status ENUM('enabled','disabled','scheduled','ended') NOT NULL DEFAULT 'enabled',
        ${audit},
        PRIMARY KEY (id),
        KEY idx_promo_tenant_supplier (tenant_id, supplier_id),
        KEY idx_promo_tenant_type_status (tenant_id, type, status)
      ) ${charset}
    `);

    // 2. 叠加/互斥/优先级配置
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        rule_json TEXT NOT NULL,
        priority INT NOT NULL DEFAULT 0,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_prule_tenant_supplier_status (tenant_id, supplier_id, status)
      ) ${charset}
    `);

    // 3. 每日特价
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_specials (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        special_price INT NOT NULL,
        slot VARCHAR(32) NULL,
        \`date\` VARCHAR(10) NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_ds_tenant_supplier_date (tenant_id, supplier_id, \`date\`),
        KEY idx_ds_tenant_sku_date (tenant_id, sku_id, \`date\`)
      ) ${charset}
    `);

    // 4. 预售定金尾款
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS presales (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        deposit INT NOT NULL,
        balance INT NOT NULL,
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_ps_tenant_supplier_status (tenant_id, supplier_id, status),
        KEY idx_ps_tenant_sku (tenant_id, sku_id)
      ) ${charset}
    `);

    // 5. 套餐
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS combos (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        name VARCHAR(128) NOT NULL,
        items_json TEXT NOT NULL,
        combo_price INT NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_combo_tenant_supplier_status (tenant_id, supplier_id, status)
      ) ${charset}
    `);

    // 6. 优惠券模板
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        name VARCHAR(128) NOT NULL,
        code VARCHAR(64) NULL,
        type VARCHAR(16) NOT NULL,
        amount INT NOT NULL,
        threshold INT NOT NULL DEFAULT 0,
        valid_from DATETIME NULL,
        valid_to DATETIME NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_coupon_tenant_supplier_status (tenant_id, supplier_id, status),
        KEY idx_coupon_tenant_supplier_code (tenant_id, supplier_id, code)
      ) ${charset}
    `);

    // 7. 用户持有券
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        coupon_id BIGINT NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        used_order_id BIGINT NULL,
        obtained_at DATETIME NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_uc_tenant_user_used (tenant_id, user_id, used),
        KEY idx_uc_tenant_coupon_user (tenant_id, coupon_id, user_id)
      ) ${charset}
    `);

    // 8. 满减
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS discount_rules (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        threshold INT NOT NULL,
        discount INT NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_dr_tenant_supplier_status (tenant_id, supplier_id, status)
      ) ${charset}
    `);

    // 9. 会员价
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS member_prices (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        \`level\` VARCHAR(32) NOT NULL,
        sku_id BIGINT NOT NULL,
        price INT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_mp_tenant_supplier_level_sku (tenant_id, supplier_id, \`level\`, sku_id)
      ) ${charset}
    `);

    // 10. 积分账户
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS points_accounts (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        balance INT NOT NULL DEFAULT 0,
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_pa_tenant_shop_user (tenant_id, shop_id, user_id)
      ) ${charset}
    `);

    // 11. 积分流水
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS points_logs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        \`change\` INT NOT NULL,
        ref_type VARCHAR(32) NULL,
        ref_no VARCHAR(64) NULL,
        remark VARCHAR(255) NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_pl_tenant_shop_user (tenant_id, shop_id, user_id),
        KEY idx_pl_tenant_ref (tenant_id, ref_type, ref_no)
      ) ${charset}
    `);

    // 12. 起批量优惠
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tier_discount_rules (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        min_qty INT NOT NULL,
        discount FLOAT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_tdr_tenant_supplier_sku (tenant_id, supplier_id, sku_id)
      ) ${charset}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'tier_discount_rules',
      'points_logs',
      'points_accounts',
      'member_prices',
      'discount_rules',
      'user_coupons',
      'coupons',
      'combos',
      'presales',
      'daily_specials',
      'promotion_rules',
      'promotions',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
}
