import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 扫码出货流水。code 唯一是防重复扫码的关键约束（唯一索引兜底）。
 */
@Entity('scan_records')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['tenantId', 'shopId', 'scannedAt'])
export class ScanRecord extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  /** 二维码完整编码，唯一：同一码只能成功扫码一次 */
  @Column({ type: 'varchar', length: 191, unique: true })
  code: string;

  @Column({ name: 'qr_code_id', type: 'bigint' })
  qrCodeId: string;

  @Column({ name: 'operator_id', type: 'bigint' })
  operatorId: string;

  @Column({ name: 'scanned_at', type: 'datetime' })
  scannedAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  batch?: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight?: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  loss?: string;

  @Column({ name: 'delivery_person', type: 'varchar', length: 64, nullable: true })
  deliveryPerson?: string;

  /** 防伪签名校验是否通过 */
  @Column({ name: 'sign_valid', type: 'boolean', default: true })
  signValid: boolean;
}
