import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 定时任务状态：jobKey 唯一，locked 用于跨实例抢锁，避免重复执行。 */
@Entity('scheduled_jobs')
@Index(['jobKey'], { unique: true })
export class ScheduledJob extends BaseEntity {
  @Column({ name: 'job_key', type: 'varchar', length: 128 })
  jobKey: string;

  @Column({ name: 'last_run', type: 'datetime', nullable: true })
  lastRun?: Date | null;

  /** 运行状态文本，例如 idle / running / failed */
  @Column({ type: 'varchar', length: 32, nullable: true })
  status?: string | null;

  @Column({ type: 'tinyint', default: 0 })
  locked: boolean;
}
