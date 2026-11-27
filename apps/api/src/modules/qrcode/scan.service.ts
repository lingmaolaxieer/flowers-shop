import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QrCodeStatus } from '@flower/shared';
import {
  Between,
  DataSource,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { getQrSignSecret, verifyCode } from '../../common/utils/signing';
import { QrCode } from '../../database/entities/qr-code.entity';
import { ScanOfflineQueue } from '../../database/entities/scan-offline-queue.entity';
import { ScanRecord } from '../../database/entities/scan-record.entity';
import { OfflineScanItemDto } from './dto/offline-sync.dto';
import { ScanRecordQueryDto } from './dto/scan-record-query.dto';

export interface ScanExtra {
  batch?: string;
  weight?: string;
  loss?: string;
  deliveryPerson?: string;
}

export interface OfflineSyncResult {
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  records: ScanRecord[];
}

@Injectable()
export class ScanService {
  private readonly logger = new Logger('ScanService');

  constructor(
    @InjectRepository(QrCode) private readonly qrRepo: Repository<QrCode>,
    @InjectRepository(ScanRecord) private readonly scanRepo: Repository<ScanRecord>,
    @InjectRepository(ScanOfflineQueue) private readonly queueRepo: Repository<ScanOfflineQueue>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /**
   * 扫码出货：防伪校验 → 防重复 → 事务写扫码流水 + 更新二维码状态。
   * code 唯一索引是防重的最后兜底。
   */
  async scan(
    scope: RequestScope,
    code: string,
    operatorId: string,
    extra: ScanExtra,
  ): Promise<ScanRecord> {
    const secret = getQrSignSecret(this.config);
    const parsed = verifyCode(code, secret);
    if (!parsed.valid) throw new BadRequestException('防伪校验失败');

    const qr = await this.findQrInScope(code, scope);
    if (!qr) throw new NotFoundException('二维码不存在');
    if (qr.status === QrCodeStatus.VOID) throw new BadRequestException('二维码已作废');
    if (qr.status === QrCodeStatus.SCANNED) throw new BadRequestException('重复扫码');

    const existing = await this.findByCode(scope, code);
    if (existing) throw new BadRequestException('重复扫码');

    const scannedAt = new Date();
    const box: { record?: ScanRecord } = {};
    try {
      await this.dataSource.transaction(async (manager) => {
        const scanRepo = manager.getRepository(ScanRecord);
        const dup = await scanRepo.findOne({ where: { code, tenantId: scope.tenantId } });
        if (dup) throw new BadRequestException('重复扫码');

        box.record = await scanRepo.save(
          scanRepo.create({
            tenantId: scope.tenantId,
            supplierId: qr.supplierId,
            shopId: scope.shopId ?? qr.shopId,
            code,
            qrCodeId: qr.id,
            operatorId,
            scannedAt,
            batch: extra.batch,
            weight: extra.weight,
            loss: extra.loss,
            deliveryPerson: extra.deliveryPerson,
            signValid: true,
          }),
        );

        await manager.getRepository(QrCode).update(
          { id: qr.id, tenantId: scope.tenantId },
          {
            status: QrCodeStatus.SCANNED,
            scannedAt,
            operatorId,
            batch: extra.batch,
            weight: extra.weight,
            loss: extra.loss,
            deliveryPerson: extra.deliveryPerson,
          },
        );
      });
    } catch (e) {
      if (this.isDuplicateEntry(e)) throw new BadRequestException('重复扫码');
      throw e;
    }

    this.notifyOrderShipped(scope, qr.orderId);
    return box.record as ScanRecord;
  }

  /**
   * 离线扫码同步：按 idempotencyKey 在租户内去重，重复 key 直接跳过并返回已存在记录。
   * 每条独立处理，单条失败不影响其他条目。
   */
  async offlineSync(
    scope: RequestScope,
    batchId: string,
    items: OfflineScanItemDto[],
  ): Promise<OfflineSyncResult> {
    const secret = getQrSignSecret(this.config);
    const result: OfflineSyncResult = {
      total: items.length,
      synced: 0,
      skipped: 0,
      failed: 0,
      records: [],
    };

    for (const item of items) {
      const queued = await this.queueRepo.findOne({
        where: { idempotencyKey: item.idempotencyKey, tenantId: scope.tenantId },
      });

      // 1) 同一幂等键已同步过 → 直接跳过，返回已有扫码记录
      if (queued?.synced) {
        const existing = await this.findByCode(scope, item.code);
        if (existing) {
          result.skipped += 1;
          result.records.push(existing);
          continue;
        }
      }

      // 2) code 唯一约束：重复扫码直接跳过
      const existing = await this.findByCode(scope, item.code);
      if (existing) {
        if (queued && !queued.synced) {
          await this.queueRepo.update({ id: queued.id }, { synced: true });
        }
        result.skipped += 1;
        result.records.push(existing);
        continue;
      }

      // 3) 防伪校验
      const parsed = verifyCode(item.code, secret);
      if (!parsed.valid) {
        result.failed += 1;
        continue;
      }

      // 4) 二维码必须存在且未作废
      const qr = await this.findQrInScope(item.code, scope);
      if (!qr || qr.status === QrCodeStatus.VOID) {
        result.failed += 1;
        continue;
      }

      // 5) 事务：写队列 + 写扫码流水 + 更新二维码状态
      const scannedAt = item.scannedAt ? new Date(item.scannedAt) : new Date();
      const box: { record?: ScanRecord } = {};
      try {
        await this.dataSource.transaction(async (manager) => {
          const scanRepo = manager.getRepository(ScanRecord);
          const dup = await scanRepo.findOne({
            where: { code: item.code, tenantId: scope.tenantId },
          });
          if (dup) {
            box.record = dup;
            return;
          }

          box.record = await scanRepo.save(
            scanRepo.create({
              tenantId: scope.tenantId,
              supplierId: qr.supplierId,
              shopId: scope.shopId ?? qr.shopId,
              code: item.code,
              qrCodeId: qr.id,
              operatorId: item.operatorId,
              scannedAt,
              batch: item.batch,
              weight: item.weight,
              loss: item.loss,
              deliveryPerson: item.deliveryPerson,
              signValid: true,
            }),
          );

          const queueRepo = manager.getRepository(ScanOfflineQueue);
          if (queued) {
            await queueRepo.update(
              { id: queued.id },
              { synced: true, payload: JSON.stringify(item) },
            );
          } else {
            await queueRepo.save(
              queueRepo.create({
                tenantId: scope.tenantId,
                supplierId: qr.supplierId,
                shopId: scope.shopId ?? qr.shopId,
                batchId,
                payload: JSON.stringify(item),
                synced: true,
                idempotencyKey: item.idempotencyKey,
              }),
            );
          }

          await manager.getRepository(QrCode).update(
            { id: qr.id, tenantId: scope.tenantId },
            {
              status: QrCodeStatus.SCANNED,
              scannedAt,
              operatorId: item.operatorId,
              batch: item.batch,
              weight: item.weight,
              loss: item.loss,
              deliveryPerson: item.deliveryPerson,
            },
          );
        });

        if (box.record) {
          result.synced += 1;
          result.records.push(box.record);
          this.notifyOrderShipped(scope, qr.orderId);
        } else {
          result.skipped += 1;
        }
      } catch (e) {
        if (this.isDuplicateEntry(e)) {
          const dup = await this.findByCode(scope, item.code);
          if (dup) {
            result.skipped += 1;
            result.records.push(dup);
            continue;
          }
        }
        result.failed += 1;
      }
    }

    return result;
  }

  /** 扫码记录列表（严格按 scope 过滤） */
  async listScanRecords(scope: RequestScope, query: ScanRecordQueryDto) {
    const where = this.buildScanWhere(scope, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.scanRepo.findAndCount({
      where,
      order: { scannedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { total, page, pageSize, items };
  }

  /**
   * 扫码记录导出数据（供 M8 用 exceljs 写出 xlsx）。
   * 这里只提供查询结果数组，不做文件生成。
   */
  async exportScanRecords(
    scope: RequestScope,
    query: ScanRecordQueryDto,
  ): Promise<Record<string, unknown>[]> {
    const rows = await this.scanRepo.find({
      where: this.buildScanWhere(scope, query),
      order: { scannedAt: 'DESC' },
    });
    return rows.map((r) => ({
      编码: r.code,
      二维码ID: r.qrCodeId,
      花店ID: r.shopId,
      操作员ID: r.operatorId,
      扫码时间: r.scannedAt,
      批次: r.batch ?? '',
      重量: r.weight ?? '',
      损耗: r.loss ?? '',
      配送人: r.deliveryPerson ?? '',
      防伪校验: r.signValid ? '通过' : '失败',
    }));
  }

  // ---------- 内部辅助 ----------

  private findQrInScope(code: string, scope: RequestScope): Promise<QrCode | null> {
    const where: Record<string, unknown> = { code, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    return this.qrRepo.findOne({ where });
  }

  private findByCode(scope: RequestScope, code: string): Promise<ScanRecord | null> {
    const where: Record<string, unknown> = { code, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    return this.scanRepo.findOne({ where });
  }

  private buildScanWhere(
    scope: RequestScope,
    query: ScanRecordQueryDto,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;
    if (query.code) where.code = query.code;

    if (query.startDate && query.endDate) {
      where.scannedAt = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.scannedAt = MoreThanOrEqual(new Date(query.startDate));
    } else if (query.endDate) {
      where.scannedAt = LessThanOrEqual(new Date(query.endDate));
    }
    return where;
  }

  private isDuplicateEntry(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false;
    const err = e as { code?: string; errno?: number };
    return err.code === 'ER_DUP_ENTRY' || err.errno === 1062;
  }

  /**
   * M3 集成点：订单模块落地后，在此注入 OrderService（@Inject(forwardRef(...))），
   * 调用 orderService.markShipped(orderId, scope) 将订单状态流转为 OrderStatus.SHIPPED。
   * 当前 M3 未集成，仅记录日志，避免对订单模块产生强依赖。
   */
  private notifyOrderShipped(scope: RequestScope, orderId: string): void {
    this.logger.log(
      `订单 ${orderId} 已出货（tenant=${scope.tenantId}, shop=${scope.shopId ?? '-'}），待 M3 集成后更新为 SHIPPED`,
    );
  }
}
