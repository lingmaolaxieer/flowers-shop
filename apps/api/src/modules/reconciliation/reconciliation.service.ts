import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OrderStatus, ReportType, StatementStatus } from '@flower/shared';
import { Shop } from '../../database/entities/shop.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { ReportExport, ReportExportStatus } from '../../database/entities/report-export.entity';
import {
  CommissionDetail,
  Order,
  Refund,
  SettlementStatement,
  SettlementStatementItem,
} from '../../database/entities';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { GenerateStatementsDto } from './dto/generate-statements.dto';
import { StatementQueryDto } from './dto/statement-query.dto';
import { buildExcelBuffer, excelFilename, ExcelColumn } from '../report/excel.util';

type Cycle = 'day' | 'week' | 'month';

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPLETED_STATUSES = [
  OrderStatus.COMPLETED,
  OrderStatus.PARTIAL_REFUNDED,
  OrderStatus.AFTER_SALE_DONE,
];

interface PeriodTotals {
  totalAmount: number;
  commissionAmount: number;
  deliveryFee: number;
  refundAmount: number;
  netAmount: number;
}

const REF_TYPE_LABELS: Record<string, string> = {
  order: '订单',
  commission: '抽成',
  refund: '退款',
  adjustment: '调整',
};

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(Shop) private readonly shopRepo: Repository<Shop>,
    @InjectRepository(SettlementStatement)
    private readonly statementRepo: Repository<SettlementStatement>,
    @InjectRepository(SettlementStatementItem)
    private readonly itemRepo: Repository<SettlementStatementItem>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(CommissionDetail)
    private readonly commissionRepo: Repository<CommissionDetail>,
    @InjectRepository(Refund) private readonly refundRepo: Repository<Refund>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(ReportExport) private readonly exportRepo: Repository<ReportExport>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * 按 shop.settlement_cycle 生成周期对账单。
   * 周期取锚定日期的上一个已完成周期（day/week/month），逐店汇总订单金额、
   * 抽成、配送费、退款；主表写 SettlementStatement，逐笔写 SettlementStatementItem
   * （order=订单 / commission=负抽成 / refund=负退款 / adjustment=配送费等）。
   */
  async generateStatements(
    scope: RequestScope,
    dto: GenerateStatementsDto,
    user: JwtPayload,
  ) {
    const anchor = dto.date ? new Date(dto.date) : new Date();
    if (Number.isNaN(anchor.getTime())) throw new BadRequestException('date 日期格式不合法');
    const { start, end } = this.resolvePeriod(dto.cycle, anchor);

    const shopWhere: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) shopWhere.supplierId = scope.supplierId;
    const targetShopId = dto.shopId ?? scope.shopId;
    if (targetShopId) shopWhere.id = targetShopId;

    const shops = await this.shopRepo.find({ where: shopWhere });
    const statements: Array<Record<string, unknown>> = [];
    let skipped = 0;

    for (const shop of shops) {
      // 花店自身配置的结算周期与请求不一致时跳过（配置为准）
      if (shop.settlementCycle && shop.settlementCycle !== dto.cycle) {
        skipped++;
        continue;
      }

      const existing = await this.statementRepo.findOne({
        where: {
          tenantId: scope.tenantId,
          supplierId: shop.supplierId,
          shopId: shop.id,
          cycle: dto.cycle,
          periodStart: start,
          periodEnd: end,
        },
      });
      if (existing && !dto.force) {
        skipped++;
        statements.push(this.toVO(existing));
        continue;
      }

      const result = await this.dataSource.transaction(async (manager) => {
        const totals = await this.collectTotals(manager, scope, shop.id, start, end);
        let statement: SettlementStatement;

        if (existing) {
          await manager.getRepository(SettlementStatement).update(
            { id: existing.id, tenantId: scope.tenantId },
            {
              totalAmount: totals.totalAmount,
              commissionAmount: totals.commissionAmount,
              status: StatementStatus.GENERATED,
            },
          );
          await manager.getRepository(SettlementStatementItem).delete({
            statementId: existing.id,
            tenantId: scope.tenantId,
          });
          statement = (await manager
            .getRepository(SettlementStatement)
            .findOne({ where: { id: existing.id } })) as SettlementStatement;
        } else {
          statement = await manager.getRepository(SettlementStatement).save(
            manager.getRepository(SettlementStatement).create({
              tenantId: scope.tenantId,
              supplierId: shop.supplierId,
              shopId: shop.id,
              cycle: dto.cycle,
              periodStart: start,
              periodEnd: end,
              status: StatementStatus.GENERATED,
              totalAmount: totals.totalAmount,
              commissionAmount: totals.commissionAmount,
            }),
          );
        }

        const items = await this.buildItems(manager, scope, shop, statement.id, start, end);
        if (items.length) {
          await manager.getRepository(SettlementStatementItem).save(items);
        }

        await manager.getRepository(AuditLog).save(
          manager.getRepository(AuditLog).create({
            tenantId: scope.tenantId,
            userId: user.sub,
            action: 'statement.generate',
            target: `SettlementStatement:${statement.id}`,
            detail: JSON.stringify({
              cycle: dto.cycle,
              periodStart: start,
              periodEnd: end,
              totals,
              rebuilt: Boolean(existing),
            }),
          }),
        );
        return statement;
      });

      statements.push(this.toVO(result));
    }

    return {
      generated: statements.length - skipped,
      skipped,
      period: { start, end },
      statements,
    };
  }

  /** 对账单列表（严格按 scope 过滤） */
  async findAll(scope: RequestScope, query: StatementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.statementWhere(scope);
    if (query.status) where.status = query.status;
    if (query.cycle) where.cycle = query.cycle;
    if (query.shopId && !scope.shopId) where.shopId = query.shopId;

    const [rows, total] = await this.statementRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, page, limit, items: rows.map((row) => this.toVO(row)) };
  }

  /** 店家确认：GENERATED -> SHOP_CONFIRMED（小程序调用） */
  async shopConfirm(scope: RequestScope, id: string, user: JwtPayload) {
    return this.transit(
      scope,
      id,
      StatementStatus.GENERATED,
      StatementStatus.SHOP_CONFIRMED,
      'statement.shop_confirm',
      user,
    );
  }

  /** 批发商审核：SHOP_CONFIRMED -> SUPPLIER_REVIEWED */
  async supplierReview(scope: RequestScope, id: string, user: JwtPayload) {
    return this.transit(
      scope,
      id,
      StatementStatus.SHOP_CONFIRMED,
      StatementStatus.SUPPLIER_REVIEWED,
      'statement.supplier_review',
      user,
    );
  }

  /** 导出对账单 Excel：SUPPLIER_REVIEWED -> EXPORTED，重复导出幂等 */
  async exportStatement(scope: RequestScope, id: string, user: JwtPayload) {
    const statement = await this.getStatement(scope, id);
    if (
      statement.status !== StatementStatus.SUPPLIER_REVIEWED &&
      statement.status !== StatementStatus.EXPORTED
    ) {
      throw new BadRequestException('对账单未完成批发审核，不能导出');
    }

    const items = await this.itemRepo.find({
      where: { statementId: statement.id, tenantId: scope.tenantId },
      order: { createdAt: 'ASC' },
    });
    const columns: ExcelColumn[] = [
      { key: 'refType', title: '明细类型', width: 18 },
      { key: 'refNo', title: '关联单号', width: 28 },
      { key: 'amount', title: '金额（元）', type: 'money' },
      { key: 'remark', title: '备注', width: 32 },
    ];
    const rows = items.map((item) => ({
      refType: REF_TYPE_LABELS[item.refType] ?? item.refType,
      refNo: item.refNo ?? '',
      amount: item.amount ?? 0,
      remark: item.remark ?? '',
    }));

    const buffer = await buildExcelBuffer([
      { name: `对账单-${this.statementNo(statement)}`, columns, rows },
    ]);

    if (statement.status !== StatementStatus.EXPORTED) {
      await this.transit(
        scope,
        id,
        StatementStatus.SUPPLIER_REVIEWED,
        StatementStatus.EXPORTED,
        'statement.export',
        user,
      );
    }

    const fileUrl = `reports/statement-${statement.id}.xlsx`;
    await this.exportRepo.save(
      this.exportRepo.create({
        tenantId: scope.tenantId,
        reportCode: ReportType.SETTLEMENT_STATEMENT,
        params: JSON.stringify({ statementId: statement.id }),
        fileUrl,
        status: ReportExportStatus.DONE,
        operatorId: user.sub,
        rowCount: rows.length,
      }),
    );

    return {
      fileUrl,
      filename: excelFilename(`statement-${statement.id}`),
      rowCount: rows.length,
      buffer,
    };
  }

  // ---------------- 内部辅助 ----------------

  /** 上一个已完成周期：[start, end) */
  private resolvePeriod(cycle: Cycle, anchor: Date): { start: Date; end: Date } {
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth();
    const day = anchor.getUTCDate();

    if (cycle === 'day') {
      return {
        start: new Date(Date.UTC(year, month, day - 1)),
        end: new Date(Date.UTC(year, month, day)),
      };
    }
    if (cycle === 'week') {
      const weekday = (anchor.getUTCDay() + 6) % 7; // 0=周一
      const thisMonday = new Date(Date.UTC(year, month, day - weekday));
      return { start: new Date(thisMonday.getTime() - 7 * DAY_MS), end: thisMonday };
    }
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }

  /** SettlementStatement 无 statement_no 字段，按周期+花店生成可读编号（仅展示/文件名） */
  private statementNo(statement: SettlementStatement): string {
    const stamp = statement.periodStart
      ? new Date(statement.periodStart).toISOString().slice(0, 10).replace(/-/g, '')
      : '00000000';
    return `ST-${String(statement.cycle).toUpperCase()}-${stamp}-${statement.shopId}`;
  }

  /** 周期汇总：订单金额 / 抽成 / 配送费 / 退款（单位：分） */
  private async collectTotals(
    manager: EntityManager,
    scope: RequestScope,
    shopId: string,
    start: Date,
    end: Date,
  ): Promise<PeriodTotals> {
    const range = { tenantId: scope.tenantId, shopId, start, end };

    const orderRow = await manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.payable_amount), 0)', 'total_amount')
      .addSelect('COALESCE(SUM(o.delivery_fee), 0)', 'delivery_fee')
      .where('o.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('o.shop_id = :shopId', { shopId })
      .andWhere('o.created_at >= :start AND o.created_at < :end', range)
      .andWhere('o.status IN (:...statuses)', { statuses: COMPLETED_STATUSES })
      .getRawOne<Record<string, string>>();

    const commissionRow = await manager
      .getRepository(CommissionDetail)
      .createQueryBuilder('cd')
      .select('COALESCE(SUM(cd.amount), 0)', 'amount')
      .where('cd.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('cd.shop_id = :shopId', { shopId })
      .andWhere('cd.created_at >= :start AND cd.created_at < :end', range)
      .getRawOne<Record<string, string>>();

    const refundRow = await manager
      .getRepository(Refund)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'amount')
      .where('r.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('r.shop_id = :shopId', { shopId })
      .andWhere('r.created_at >= :start AND r.created_at < :end', range)
      .getRawOne<Record<string, string>>();

    const totalAmount = Number(orderRow?.total_amount ?? 0);
    const deliveryFee = Number(orderRow?.delivery_fee ?? 0);
    const commissionAmount = Number(commissionRow?.amount ?? 0);
    const refundAmount = Number(refundRow?.amount ?? 0);

    return {
      totalAmount,
      commissionAmount,
      deliveryFee,
      refundAmount,
      netAmount: totalAmount + deliveryFee - commissionAmount - refundAmount,
    };
  }

  /** 逐订单生成对账明细（M5 的 item 只有 refType/refNo/amount/remark） */
  private async buildItems(
    manager: EntityManager,
    scope: RequestScope,
    shop: Shop,
    statementId: string,
    start: Date,
    end: Date,
  ): Promise<SettlementStatementItem[]> {
    const range = { tenantId: scope.tenantId, shopId: shop.id, start, end };
    const orderRows = await manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .select('o.order_no', 'order_no')
      .addSelect('COALESCE(o.payable_amount, 0)', 'total_amount')
      .addSelect('COALESCE(o.delivery_fee, 0)', 'delivery_fee')
      .where('o.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('o.shop_id = :shopId', { shopId: shop.id })
      .andWhere('o.created_at >= :start AND o.created_at < :end', range)
      .andWhere('o.status IN (:...statuses)', { statuses: COMPLETED_STATUSES })
      .orderBy('o.created_at', 'ASC')
      .getRawMany<Record<string, any>>();

    const commissionRows = await manager
      .getRepository(CommissionDetail)
      .createQueryBuilder('cd')
      .select('cd.order_no', 'order_no')
      .addSelect('COALESCE(SUM(cd.amount), 0)', 'amount')
      .where('cd.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('cd.shop_id = :shopId', { shopId: shop.id })
      .andWhere('cd.created_at >= :start AND cd.created_at < :end', range)
      .groupBy('cd.order_no')
      .getRawMany<Record<string, any>>();

    const refundRows = await manager
      .getRepository(Refund)
      .createQueryBuilder('r')
      .select('r.order_id', 'order_id')
      .addSelect('GROUP_CONCAT(r.refund_no)', 'refund_nos')
      .addSelect('COALESCE(SUM(r.amount), 0)', 'amount')
      .where('r.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('r.shop_id = :shopId', { shopId: shop.id })
      .andWhere('r.created_at >= :start AND r.created_at < :end', range)
      .groupBy('r.order_id')
      .getRawMany<Record<string, any>>();

    const byOrderNo = (rows: Record<string, any>[]) =>
      new Map(rows.map((row) => [String(row.order_no), Number(row.amount ?? 0)]));
    const commissionMap = byOrderNo(commissionRows);
    const refundMap = new Map(
      refundRows.map((row) => [
        String(row.order_id),
        { amount: Number(row.amount ?? 0), nos: String(row.refund_nos ?? '') },
      ]),
    );

    const repo = manager.getRepository(SettlementStatementItem);
    const items: SettlementStatementItem[] = [];
    // Order 主表只存 order_no，退款表用 order_id 关联；这里用 orderNo 反查订单 ID 映射
    const orderIdRows = await manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .select('o.id', 'id')
      .addSelect('o.order_no', 'order_no')
      .where('o.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('o.shop_id = :shopId', { shopId: shop.id })
      .andWhere('o.created_at >= :start AND o.created_at < :end', range)
      .getRawMany<Record<string, any>>();
    const orderIdByNo = new Map(
      orderIdRows.map((row) => [String(row.order_no), String(row.id)]),
    );

    const makeItem = (
      refType: string,
      refNo: string,
      amount: number,
      remark?: string,
    ): SettlementStatementItem =>
      repo.create({
        tenantId: scope.tenantId,
        supplierId: shop.supplierId,
        shopId: shop.id,
        statementId,
        refType,
        refNo,
        amount,
        remark: remark ?? null,
      });

    for (const row of orderRows) {
      const orderNo = String(row.order_no);
      const totalAmount = Number(row.total_amount ?? 0);
      const deliveryFee = Number(row.delivery_fee ?? 0);
      const commission = commissionMap.get(orderNo) ?? 0;
      const refund = refundMap.get(orderIdByNo.get(orderNo) ?? '') ?? {
        amount: 0,
        nos: '',
      };

      items.push(makeItem('order', orderNo, totalAmount));
      if (commission > 0) items.push(makeItem('commission', orderNo, -commission));
      if (deliveryFee > 0) {
        items.push(makeItem('adjustment', orderNo, deliveryFee, '配送费'));
      }
      if (refund.amount > 0) {
        items.push(makeItem('refund', refund.nos || orderNo, -refund.amount, '退款冲抵'));
      }
    }
    return items;
  }

  private async transit(
    scope: RequestScope,
    id: string,
    from: StatementStatus,
    to: StatementStatus,
    action: string,
    user: JwtPayload,
  ) {
    const statement = await this.getStatement(scope, id);
    if (statement.status !== from) {
      throw new BadRequestException(
        `当前状态为 ${statement.status}，不能从 ${from} 流转到 ${to}`,
      );
    }
    await this.statementRepo.update(
      { id: statement.id, tenantId: scope.tenantId },
      { status: to },
    );
    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId: scope.tenantId,
        userId: user.sub,
        action,
        target: `SettlementStatement:${statement.id}`,
        detail: JSON.stringify({ from, to }),
      }),
    );
    return { id: statement.id, statementNo: this.statementNo(statement), status: to };
  }

  private async getStatement(scope: RequestScope, id: string): Promise<SettlementStatement> {
    const statement = await this.statementRepo.findOne({
      where: this.statementWhere(scope, id),
    });
    if (!statement) throw new NotFoundException('对账单不存在或无权访问');
    return statement;
  }

  private statementWhere(scope: RequestScope, id?: string): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (id) where.id = id;
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;
    return where;
  }

  private toVO(statement: SettlementStatement) {
    return {
      id: statement.id,
      statementNo: this.statementNo(statement),
      shopId: statement.shopId,
      supplierId: statement.supplierId,
      cycle: statement.cycle,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      totalAmount: statement.totalAmount,
      commissionAmount: statement.commissionAmount,
      netAmount: statement.totalAmount - statement.commissionAmount,
      status: statement.status,
      createdAt: statement.createdAt,
    };
  }
}
