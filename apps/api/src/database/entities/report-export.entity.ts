import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 导出任务状态（本模块内部使用，不放 shared 包） */
export enum ReportExportStatus {
  PENDING = 'pending',
  DONE = 'done',
  FAILED = 'failed',
}

/** 报表导出记录：记录每次导出的报表、参数、结果与行数。 */
@Entity('report_exports')
@Index(['tenantId', 'reportCode'])
@Index(['tenantId', 'status'])
export class ReportExport extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'report_code', type: 'varchar', length: 64 })
  reportCode: string;

  /** 查询参数 JSON 原文 */
  @Column({ type: 'text' })
  params: string;

  @Column({ name: 'file_url', type: 'varchar', length: 512, nullable: true })
  fileUrl?: string | null;

  @Column({
    type: 'simple-enum',
    enum: ReportExportStatus,
    default: ReportExportStatus.PENDING,
  })
  status: ReportExportStatus;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId?: string | null;

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount?: number | null;
}
