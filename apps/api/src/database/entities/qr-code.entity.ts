import { Column, Entity, Index } from 'typeorm';
import { QrCodeStatus } from '@flower/shared';
import { BaseEntity } from './base.entity';

/**
 * 一单位一码的防伪二维码。
 * 编码规则：订单号 + 商品ID + 单位序号 + 防伪签名（详见 common/utils/signing.ts）。
 */
@Entity('qr_codes')
@Index(['tenantId', 'supplierId', 'shopId'])
@Index(['tenantId', 'orderId'])
@Index(['tenantId', 'status'])
export class QrCode extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint' })
  tenantId: string;

  @Column({ name: 'supplier_id', type: 'bigint' })
  supplierId: string;

  @Column({ name: 'shop_id', type: 'bigint' })
  shopId: string;

  /** 订单号（M3 订单的主键/单号，作为防伪签名原文的一部分） */
  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'order_item_id', type: 'bigint', nullable: true })
  orderItemId?: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  /** 单位序号：同一商品第几单位，从 1 开始 */
  @Column({ name: 'unit_seq', type: 'int' })
  unitSeq: number;

  /** 完整二维码编码，唯一（防重复扫码 + 防伪造） */
  @Column({ type: 'varchar', length: 191, unique: true })
  code: string;

  /** 防伪签名：HMAC-SHA256(订单号, 商品ID, 单位序号) */
  @Column({ type: 'varchar', length: 64 })
  signature: string;

  /** 批次（扫码时回填，便于 M8 对账导出） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  batch?: string;

  /** 称重（扫码时回填，单位 kg） */
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight?: string;

  /** 损耗（扫码时回填） */
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  loss?: string;

  @Column({ name: 'delivery_person', type: 'varchar', length: 64, nullable: true })
  deliveryPerson?: string;

  @Column({ type: 'simple-enum', enum: QrCodeStatus, default: QrCodeStatus.ACTIVE })
  status: QrCodeStatus;

  @Column({ name: 'scanned_at', type: 'datetime', nullable: true })
  scannedAt?: Date;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId?: string;
}
