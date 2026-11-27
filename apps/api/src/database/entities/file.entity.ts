import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 文件登记：对象存储 key 与访问 URL 的映射（实际存储由 StorageService 提供）。 */
@Entity('files')
@Index(['tenantId', 'bizType'])
@Index(['tenantId', 'storageKey'], { unique: true })
export class FileRecord extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey: string;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  /** 业务类型，例如 report_export / license */
  @Column({ name: 'biz_type', type: 'varchar', length: 64, nullable: true })
  bizType?: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 128, nullable: true })
  mimeType?: string | null;

  /** 文件大小，单位字节 */
  @Column({ type: 'int', nullable: true })
  size?: number | null;
}
