import { Column, Entity, Index } from 'typeorm';
import { ReportType, Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/**
 * 报表定义：code 存 ReportType 的字符串值，sqlKey 为服务端内置的查询实现键。
 * 本表为配置字典，sqlKey 不允许由客户端传入，防止任意 SQL 执行。
 */
@Entity('report_definitions')
@Index(['tenantId', 'code'], { unique: true })
export class ReportDefinition extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  /** ReportType 的字符串值，例如 sales / commission_detail */
  @Column({ type: 'varchar', length: 64 })
  code: ReportType;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** 服务端内置查询键，与 code 一一对应 */
  @Column({ name: 'sql_key', type: 'varchar', length: 64 })
  sqlKey: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
