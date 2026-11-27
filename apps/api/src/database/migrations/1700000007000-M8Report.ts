import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M8 周期对账 / 报表 / 导出相关 7 张表。
 * 金额统一 BIGINT 存分；所有业务表带 tenant_id。
 */
export class M8Report1700000007000 implements MigrationInterface {
  name = 'M8Report1700000007000';

  private readonly charset = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
  private readonly audit = `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 报表定义
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_definitions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        sql_key VARCHAR(64) NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${this.audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_report_def_tenant_code (tenant_id, code)
      ) ${this.charset}
    `);

    // 2. 报表导出记录
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_exports (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        report_code VARCHAR(64) NOT NULL,
        params TEXT NOT NULL,
        file_url VARCHAR(512) NULL,
        status ENUM('pending','done','failed') NOT NULL DEFAULT 'pending',
        operator_id BIGINT NULL,
        row_count INT NULL,
        ${this.audit},
        PRIMARY KEY (id),
        KEY idx_report_exports_tenant_code (tenant_id, report_code),
        KEY idx_report_exports_tenant_status (tenant_id, status)
      ) ${this.charset}
    `);

    // 3. Webhook 订阅
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        event VARCHAR(128) NOT NULL,
        callback_url VARCHAR(512) NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        ${this.audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_webhook_tenant_event_url (tenant_id, event, callback_url),
        KEY idx_webhook_tenant_status (tenant_id, status)
      ) ${this.charset}
    `);

    // 4. 操作审计日志
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        action VARCHAR(64) NOT NULL,
        target VARCHAR(128) NULL,
        detail TEXT NULL,
        ip VARCHAR(64) NULL,
        ${this.audit},
        PRIMARY KEY (id),
        KEY idx_audit_logs_tenant_time (tenant_id, created_at),
        KEY idx_audit_logs_tenant_user (tenant_id, user_id),
        KEY idx_audit_logs_tenant_action (tenant_id, action)
      ) ${this.charset}
    `);

    // 5. 幂等键（key 为 MySQL 保留字，必须转义）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        \`key\` VARCHAR(128) NOT NULL,
        scope VARCHAR(64) NULL,
        response TEXT NULL,
        ${this.audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_idempotency_tenant_key (tenant_id, \`key\`)
      ) ${this.charset}
    `);

    // 6. 文件登记
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS files (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tenant_id BIGINT NOT NULL,
        storage_key VARCHAR(512) NOT NULL,
        url VARCHAR(512) NOT NULL,
        biz_type VARCHAR(64) NULL,
        mime_type VARCHAR(128) NULL,
        size INT NULL,
        ${this.audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_files_tenant_storage (tenant_id, storage_key),
        KEY idx_files_tenant_biz (tenant_id, biz_type)
      ) ${this.charset}
    `);

    // 7. 定时任务状态（系统级，不带租户字段）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        job_key VARCHAR(128) NOT NULL,
        last_run DATETIME NULL,
        status VARCHAR(32) NULL,
        locked TINYINT NOT NULL DEFAULT 0,
        ${this.audit},
        PRIMARY KEY (id),
        UNIQUE KEY uk_scheduled_jobs_key (job_key)
      ) ${this.charset}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS scheduled_jobs`);
    await queryRunner.query(`DROP TABLE IF EXISTS files`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS webhook_subscriptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_exports`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_definitions`);
  }
}
