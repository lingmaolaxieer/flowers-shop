import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { InventoryChangeType, StockAlertStatus } from '@flower/shared';
import {
  Inventory,
  InventoryLock,
  InventoryLog,
  LossRecord,
  StockAlert,
} from '../../database/entities';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateLossDto } from './dto/create-loss.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

/** 订单锁单有效期：30 分钟，超时后由 M3 订单侧触发 unlockStock。 */
const LOCK_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory) private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryLock) private readonly lockRepo: Repository<InventoryLock>,
    @InjectRepository(InventoryLog) private readonly logRepo: Repository<InventoryLog>,
    @InjectRepository(LossRecord) private readonly lossRepo: Repository<LossRecord>,
    @InjectRepository(StockAlert) private readonly alertRepo: Repository<StockAlert>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== 管理端：查询 / 调整 / 损耗 / 预警 ====================

  async list(scope: RequestScope, query: QueryInventoryDto) {
    const where = this.scoped(scope, {});
    if (query.shopId) where.shopId = query.shopId;
    if (query.skuId) where.skuId = query.skuId;
    return this.inventoryRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async listAlerts(scope: RequestScope, status?: StockAlertStatus) {
    const where = this.scoped(scope, {});
    if (status) where.status = status;
    return this.alertRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /** 人工调整：正数为入库，负数为出库，均写流水，不做自动回补。 */
  async adjust(scope: RequestScope, dto: AdjustInventoryDto, operatorId?: string) {
    const { shopId, supplierId } = this.requireIdentifiers(scope);
    return this.dataSource.transaction(async (manager) => {
      const inv = await this.ensureInventory(manager, scope, shopId, dto.skuId);
      if (dto.qty < 0 && inv.available < -dto.qty) {
        throw new BadRequestException('可售库存不足，无法出库调整');
      }
      const before = inv.available;
      inv.available += dto.qty;
      inv.total += dto.qty;
      await manager.save(inv);
      await this.writeLog(manager, {
        tenantId: scope.tenantId,
        supplierId,
        shopId,
        skuId: dto.skuId,
        changeType: InventoryChangeType.MANUAL_ADJUST,
        qty: dto.qty,
        beforeQty: before,
        afterQty: inv.available,
        refNo: dto.reason ?? null,
        operatorId: operatorId ?? null,
      });
      return inv;
    });
  }

  /** 损耗登记：只减 total/available 并写 LossRecord + 流水，绝不自动补货。 */
  async loss(scope: RequestScope, dto: CreateLossDto, operatorId: string) {
    const { shopId, supplierId } = this.requireIdentifiers(scope);
    return this.dataSource.transaction(async (manager) => {
      const inv = await this.findLockedInventory(manager, scope, shopId, dto.skuId);
      if (!inv) throw new NotFoundException('库存记录不存在，请先入库');
      if (inv.available < dto.qty) throw new BadRequestException('可售库存不足，无法登记损耗');

      const before = inv.available;
      inv.available -= dto.qty;
      inv.total -= dto.qty;
      await manager.save(inv);
      await manager.save(
        manager.create(LossRecord, {
          tenantId: scope.tenantId,
          supplierId,
          shopId,
          skuId: dto.skuId,
          qty: dto.qty,
          reason: dto.reason,
          operatorId,
        }),
      );
      await this.writeLog(manager, {
        tenantId: scope.tenantId,
        supplierId,
        shopId,
        skuId: dto.skuId,
        changeType: InventoryChangeType.LOSS,
        qty: -dto.qty,
        beforeQty: before,
        afterQty: inv.available,
        refNo: dto.reason,
        operatorId,
      });
      return { inventory: inv };
    });
  }

  /** 人工确认预警：只改状态，禁止自动回补库存。 */
  async confirmAlert(id: string, scope: RequestScope, confirmerId: string) {
    const alert = await this.alertRepo.findOne({ where: this.scoped(scope, { id }) });
    if (!alert) throw new NotFoundException('库存预警不存在');
    if (alert.status !== StockAlertStatus.PENDING) {
      throw new BadRequestException('该预警已处理，请勿重复确认');
    }
    await this.alertRepo.update(
      { id },
      { status: StockAlertStatus.CONFIRMED, confirmerId },
    );
    return { id, status: StockAlertStatus.CONFIRMED };
  }

  // ==================== 供 M3 订单调用的库存核心方法 ====================

  /**
   * 锁定库存。事务内对库存行加悲观写锁，available 不足时抛异常并落一条 PENDING 预警，绝不超卖。
   * 预警使用独立 Repository 写入，确保随异常回滚后仍保留取证记录。
   */
  async lockStock(scope: RequestScope, skuId: string, qty: number, orderId: string) {
    const { shopId, supplierId } = this.requireIdentifiers(scope);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('锁定数量必须为正整数');
    }
    return this.dataSource.transaction(async (manager) => {
      const inv = await this.findLockedInventory(manager, scope, shopId, skuId);
      if (!inv || inv.available < qty) {
        await this.alertRepo.save(
          this.alertRepo.create({
            tenantId: scope.tenantId,
            supplierId,
            shopId,
            refType: 'order',
            refId: orderId,
            qty,
            status: StockAlertStatus.PENDING,
          }),
        );
        throw new BadRequestException('可售库存不足，无法锁定');
      }
      const before = inv.available;
      inv.available -= qty; // 行锁保护下直接改实体，避免拼接 SQL
      inv.locked += qty;
      await manager.save(inv);

      const lock = await manager.save(
        manager.create(InventoryLock, {
          tenantId: scope.tenantId,
          supplierId,
          shopId,
          orderId,
          skuId,
          qty,
          expireAt: new Date(Date.now() + LOCK_TTL_MS),
        }),
      );
      await this.writeLog(manager, {
        tenantId: scope.tenantId,
        supplierId,
        shopId,
        skuId,
        changeType: InventoryChangeType.ORDER_LOCK,
        qty,
        beforeQty: before,
        afterQty: inv.available,
        refNo: orderId,
      });
      return { inventory: inv, lock };
    });
  }

  /** 解锁库存（订单取消/超时）：available+=qty，locked-=qty，并清理锁单。 */
  async unlockStock(scope: RequestScope, orderId: string) {
    const { shopId, supplierId } = this.requireIdentifiers(scope);
    return this.dataSource.transaction(async (manager) => {
      const locks = await manager.find<InventoryLock>(InventoryLock, {
        where: this.scoped(scope, { shopId, orderId }),
      });
      if (!locks.length) throw new NotFoundException('未找到该订单的库存锁记录');

      const released: Array<{ skuId: string; qty: number }> = [];
      for (const lock of locks) {
        const inv = await this.findLockedInventory(manager, scope, shopId, lock.skuId);
        if (!inv) throw new NotFoundException('库存记录不存在，无法解锁');
        if (inv.locked < lock.qty) throw new BadRequestException('锁定量异常，无法解锁');
        const before = inv.available;
        inv.available += lock.qty;
        inv.locked -= lock.qty;
        await manager.save(inv);
        await this.writeLog(manager, {
          tenantId: scope.tenantId,
          supplierId,
          shopId,
          skuId: lock.skuId,
          changeType: InventoryChangeType.ORDER_UNLOCK,
          qty: lock.qty,
          beforeQty: before,
          afterQty: inv.available,
          refNo: orderId,
        });
        await manager.delete(InventoryLock, { id: lock.id });
        released.push({ skuId: lock.skuId, qty: lock.qty });
      }
      return released;
    });
  }

  /** 扣减库存（订单确认）：locked-=qty，total-=qty，并清理锁单。 */
  async deductStock(scope: RequestScope, orderId: string) {
    const { shopId, supplierId } = this.requireIdentifiers(scope);
    return this.dataSource.transaction(async (manager) => {
      const locks = await manager.find<InventoryLock>(InventoryLock, {
        where: this.scoped(scope, { shopId, orderId }),
      });
      if (!locks.length) throw new NotFoundException('未找到该订单的库存锁记录');

      const deducted: Array<{ skuId: string; qty: number }> = [];
      for (const lock of locks) {
        const inv = await this.findLockedInventory(manager, scope, shopId, lock.skuId);
        if (!inv || inv.locked < lock.qty || inv.total < lock.qty) {
          throw new BadRequestException('库存数据异常，无法扣减');
        }
        const before = inv.available;
        inv.locked -= lock.qty;
        inv.total -= lock.qty;
        await manager.save(inv);
        await this.writeLog(manager, {
          tenantId: scope.tenantId,
          supplierId,
          shopId,
          skuId: lock.skuId,
          changeType: InventoryChangeType.ORDER_DEDUCT,
          qty: -lock.qty,
          beforeQty: before,
          afterQty: inv.available,
          refNo: orderId,
        });
        await manager.delete(InventoryLock, { id: lock.id });
        deducted.push({ skuId: lock.skuId, qty: lock.qty });
      }
      return deducted;
    });
  }

  // ==================== 内部辅助 ====================

  /** 行级悲观写锁查询，调用方必须处于事务中。 */
  private findLockedInventory(
    manager: EntityManager,
    scope: RequestScope,
    shopId: string,
    skuId: string,
  ): Promise<Inventory | null> {
    const qb = manager
      .createQueryBuilder(Inventory, 'inv')
      .setLock('pessimistic_write')
      .where('inv.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('inv.shop_id = :shopId', { shopId })
      .andWhere('inv.sku_id = :skuId', { skuId });
    if (scope.supplierId) {
      qb.andWhere('inv.supplier_id = :supplierId', { supplierId: scope.supplierId });
    }
    return qb.getOne();
  }

  /** 调整入库时若库存记录不存在则初始化一条。 */
  private async ensureInventory(
    manager: EntityManager,
    scope: RequestScope,
    shopId: string,
    skuId: string,
  ): Promise<Inventory> {
    const found = await this.findLockedInventory(manager, scope, shopId, skuId);
    if (found) return found;
    const { supplierId } = this.requireIdentifiers(scope);
    return manager.save(
      manager.create(Inventory, {
        tenantId: scope.tenantId,
        supplierId,
        shopId,
        skuId,
        total: 0,
        available: 0,
        locked: 0,
      }),
    );
  }

  private async writeLog(
    manager: EntityManager,
    params: {
      tenantId: string;
      supplierId: string;
      shopId: string;
      skuId: string;
      changeType: InventoryChangeType;
      qty: number;
      beforeQty: number;
      afterQty: number;
      refNo?: string | null;
      operatorId?: string | null;
    },
  ): Promise<void> {
    await manager.save(
      manager.create(InventoryLog, {
        tenantId: params.tenantId,
        supplierId: params.supplierId,
        shopId: params.shopId,
        skuId: params.skuId,
        changeType: params.changeType,
        qty: params.qty,
        beforeQty: params.beforeQty,
        afterQty: params.afterQty,
        refNo: params.refNo ?? null,
        operatorId: params.operatorId ?? null,
      }),
    );
  }

  private requireIdentifiers(scope: RequestScope): { shopId: string; supplierId: string } {
    if (!scope.shopId) throw new BadRequestException('当前身份未关联花店');
    if (!scope.supplierId) throw new BadRequestException('当前身份未关联批发商');
    return { shopId: scope.shopId, supplierId: scope.supplierId };
  }

  private scoped(scope: RequestScope, extra: Record<string, unknown>): FindOptionsWhere<any> {
    const where: Record<string, unknown> = { tenantId: scope.tenantId, ...extra };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    return where as FindOptionsWhere<any>;
  }
}
