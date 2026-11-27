import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M1 初始化：账号、角色、多身份、店家审核相关 11 张表。
 * 全表带 tenant_id / supplier_id（系统字典表除外）。
 * 金额字段后续里程碑出现时统一 BIGINT 存分。
 */
export class M1Init1700000000000 implements MigrationInterface {
  name = 'M1Init1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    const audit = `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;

    // 1. 租户
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(128) NOT NULL,
        type ENUM('platform','supplier') NOT NULL DEFAULT 'supplier',
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id)
      ) ${charset}
    `);

    // 2. 批发商
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        name VARCHAR(128) NOT NULL,
        contact_name VARCHAR(64) NULL,
        contact_phone VARCHAR(20) NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_suppliers_tenant (tenant_id)
      ) ${charset}
    `);

    // 3. 花店
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        name VARCHAR(128) NOT NULL,
        owner_user_id BIGINT NOT NULL,
        license_no VARCHAR(64) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        audit_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        audited_by BIGINT NULL,
        audited_at DATETIME NULL,
        audit_remark VARCHAR(255) NULL,
        settlement_cycle VARCHAR(10) NOT NULL DEFAULT 'month',
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_shops_tenant_supplier (tenant_id, supplier_id),
        KEY idx_shops_owner (owner_user_id)
      ) ${charset}
    `);

    // 4. 微信用户
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT NOT NULL AUTO_INCREMENT,
        openid VARCHAR(64) NOT NULL,
        unionid VARCHAR(64) NULL,
        phone VARCHAR(20) NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_users_openid (openid)
      ) ${charset}
    `);

    // 5. 用户身份（多身份切换）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_identities (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        tenant_id BIGINT NOT NULL,
        role_code ENUM('PLATFORM_ADMIN','SUPPLIER_ADMIN','SUPPLIER_PICKER','SUPPLIER_SERVICE','SHOP_MANAGER','SHOP_STAFF','CUSTOMER','DELIVERY_PERSON') NOT NULL,
        supplier_id BIGINT NULL,
        shop_id BIGINT NULL,
        audit_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
        last_used_at DATETIME NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_ui_user (user_id),
        KEY idx_ui_tenant (tenant_id)
      ) ${charset}
    `);

    // 6. 角色
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NULL,
        role_code VARCHAR(64) NOT NULL,
        name VARCHAR(64) NOT NULL,
        scope ENUM('platform','supplier','shop','personal') NOT NULL DEFAULT 'personal',
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_roles_tenant_code (tenant_id, role_code)
      ) ${charset}
    `);

    // 7. 权限点
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        perm_code VARCHAR(64) NOT NULL,
        module VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        description VARCHAR(128) NULL,
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_perm_code (perm_code)
      ) ${charset}
    `);

    // 8. 角色-权限
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        role_id BIGINT NOT NULL,
        perm_id BIGINT NOT NULL,
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_role_perm (role_id, perm_id)
      ) ${charset}
    `);

    // 9. 用户-角色绑定（子账号）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_role_bindings (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        role_id BIGINT NOT NULL,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NULL,
        shop_id BIGINT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_urb_user (user_id),
        KEY idx_urb_tenant_role (tenant_id, role_id)
      ) ${charset}
    `);

    // 10. 店家审核
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shop_audits (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        license_no VARCHAR(64) NOT NULL,
        license_image VARCHAR(255) NULL,
        contact_phone VARCHAR(20) NOT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        auditor_id BIGINT NULL,
        audit_remark VARCHAR(255) NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_sa_tenant_status (tenant_id, status),
        KEY idx_sa_shop (shop_id)
      ) ${charset}
    `);

    // 11. 系统配置
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system_configs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        \`key\` VARCHAR(64) NOT NULL,
        value TEXT NOT NULL,
        description VARCHAR(255) NULL,
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_config_key (\`key\`)
      ) ${charset}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'system_configs',
      'shop_audits',
      'user_role_bindings',
      'role_permissions',
      'permissions',
      'roles',
      'user_identities',
      'users',
      'shops',
      'suppliers',
      'tenants',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
}
