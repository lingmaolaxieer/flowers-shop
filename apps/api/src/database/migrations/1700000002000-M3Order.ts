import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M3 订单：订单主表、明细、状态日志、留言、地址、退款、售后共 7 张表。
 * 金额一律 BIGINT 存整数分；全表带 tenant_id / supplier_id / shop_id。
 */
export class M3Order1700000002000 implements MigrationInterface {
  name = 'M3Order1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    const audit = `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;
    const orderStatus = `'pending_confirm','confirmed','pending_pay','paid','pending_accept','accepted','picking','shipped','delivering','pending_pickup','completed','cancelled','refunding','partial_refunded','replacement','after_sale_done'`;

    // 1. 订单主表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        order_no VARCHAR(64) NOT NULL,
        order_type ENUM('customer','shop') NOT NULL,
        buyer_user_id BIGINT NOT NULL,
        status ENUM(${orderStatus}) NOT NULL DEFAULT 'pending_confirm',
        pay_status ENUM('unpaid','paid','refunding','refunded','partial_refunded') NOT NULL DEFAULT 'unpaid',
        delivery_method ENUM('same_city','cold_chain','express','pickup','dedicated') NULL,
        goods_amount BIGINT NOT NULL DEFAULT 0,
        delivery_fee BIGINT NOT NULL DEFAULT 0,
        discount_amount BIGINT NOT NULL DEFAULT 0,
        payable_amount BIGINT NOT NULL DEFAULT 0,
        confirm_deadline DATETIME NULL,
        remark VARCHAR(255) NULL,
        cancel_reason VARCHAR(255) NULL,
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_orders_order_no (order_no),
        KEY idx_orders_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_orders_tenant_status_deadline (tenant_id, status, confirm_deadline),
        KEY idx_orders_buyer (buyer_user_id)
      ) ${charset}
    `);

    // 2. 订单明细
    await queryRunner.query(`
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
        ${audit},
        PRIMARY KEY (id),
        KEY idx_oi_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_oi_order (order_id),
        KEY idx_oi_sku (sku_id)
      ) ${charset}
    `);

    // 3. 状态流转日志
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_status_logs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        supplier_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        order_id BIGINT NOT NULL,
        from_status ENUM(${orderStatus}) NULL,
        to_status ENUM(${orderStatus}) NOT NULL,
        operator_id BIGINT NULL,
        note VARCHAR(255) NULL,
        ${audit},
        PRIMARY KEY (id),
        KEY idx_osl_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_osl_order (order_id)
      ) ${charset}
    `);

    // 4. 留言 / 电话 / 客服
    await queryRunner.query(`
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
        ${audit},
        PRIMARY KEY (id),
        KEY idx_om_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_om_order (order_id)
      ) ${charset}
    `);

    // 5. 收货 / 自提信息
    await queryRunner.query(`
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
        ${audit},
        PRIMARY KEY (id),
        KEY idx_oa_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_oa_order (order_id)
      ) ${charset}
    `);

    // 6. 退款单
    await queryRunner.query(`
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
        ${audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_refunds_refund_no (refund_no),
        KEY idx_refunds_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_refunds_order (order_id)
      ) ${charset}
    `);

    // 7. 售后单
    await queryRunner.query(`
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
        ${audit},
        PRIMARY KEY (id),
        KEY idx_as_tenant_supplier_shop (tenant_id, supplier_id, shop_id),
        KEY idx_as_order (order_id)
      ) ${charset}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'after_sales',
      'refunds',
      'order_addresses',
      'order_messages',
      'order_status_logs',
      'order_items',
      'orders',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
}
