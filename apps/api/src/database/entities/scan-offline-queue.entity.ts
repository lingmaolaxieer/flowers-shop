import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 弱网离线扫码待同步队列。
 * idempotencyKey 在租户内唯一：重复同步直接跳过，保证幂等。
 * createdAt 复用 BaseEntity 的 created_at，不重复声明。
 */
@Entity('scan_offline_queue')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['tenantId', 'idempotencyKey'], { unique: true })
export class ScanOfflineQueue extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  /** 客户端离线批次号 */
  @Column({ name: 'batch_id', type: 'varchar', length: 64 })
  batchId: string;

  /** 原始扫码记录（JSON 字符串） */
  @Column({ type: 'text' })
  payload: string;

  @Column({ type: 'boolean', default: false })
  synced: boolean;

  /** 客户端生成的幂等键，租户内唯一 */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey: string;
}
