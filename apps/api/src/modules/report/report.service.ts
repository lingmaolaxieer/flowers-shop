import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { CommissionDimension, DeliveryMethod, ReportType, Status } from '@flower/shared';
import { Shop } from '../../database/entities/shop.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { WebhookSubscription } from '../../database/entities/webhook-subscription.entity';
import { ReportExport, ReportExportStatus } from '../../database/entities/report-export.entity';
import {
  CommissionDetail,
  InventoryLog,
  LossRecord,
  Order,
  OrderItem,
  Presale,
  Product,
  ProductSku,
  Refund,
  SettlementStatement,
  Shipment,
} from '../../database/entities';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { ReportQueryDto } from './dto/report-query.dto';
import { WebhookSubscribeDto } from './dto/webhook-subscribe.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { buildExcelBuffer, excelFilename, ExcelColumn } from './excel.util';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReportColumn extends ExcelColumn {}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
}

const REPORT_SHEET_NAMES: Record<ReportType, string> = {
  [ReportType.SALES]: '销量报表',
  [ReportType.INVENTORY_LOSS]: '库存损耗',
  [ReportType.COMMISSION_DETAIL]: '抽成明细',
  [ReportType.SETTLEMENT_STATEMENT]: '周期对账单',
  [ReportType.DELIVERY_FEE]: '配送费明细',
  [ReportType.REFUND_DETAIL]: '退款明细',
  [ReportType.PRODUCT_TURNOVER]: '商品动销',
  [ReportType.PRESALE_STATS]: '节日预售统计',
};

const DELIVERY_LABELS: Record<string, string> = {
  [DeliveryMethod.SAME_CITY]: '同城配送',
  [DeliveryMethod.COLD_CHAIN]: '冷链配送',
  [DeliveryMethod.EXPRESS]: '快递',
  [DeliveryMethod.PICKUP]: '自提',
  [DeliveryMethod.DEDICATED]: '专车配送',
};

const DIMENSION_LABELS: Record<string, string> = {
  [CommissionDimension.ORDER_RATIO]: '订单比例',
  [CommissionDimension.DELIVERY_METHOD]: '配送方式',
  [CommissionDimension.SHOP]: '花店',
  [CommissionDimension.CATEGORY]: '品类',
};

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductSku) private readonly skuRepo: Repository<ProductSku>,
    @InjectRepository(InventoryLog) private readonly inventoryLogRepo: Repository<InventoryLog>,
    @InjectRepository(LossRecord) private readonly lossRepo: Repository<LossRecord>,
    @InjectRepository(CommissionDetail)
    private readonly commissionRepo: Repository<CommissionDetail>,
    @InjectRepository(SettlementStatement)
    private readonly statementRepo: Repository<SettlementStatement>,
    @InjectRepository(Shipment) private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Refund) private readonly refundRepo: Repository<Refund>,
    @InjectRepository(Presale) private readonly presaleRepo: Repository<Presale>,
    @InjectRepository(Shop) private readonly shopRepo: Repository<Shop>,
    @InjectRepository(ReportExport) private readonly exportRepo: Repository<ReportExport>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(WebhookSubscription)
    private readonly webhookRepo: Repository<WebhookSubscription>,
  ) {}

  /**
   * 报表查询入口：ReportType -> 内置 QueryBuilder 聚合。
   * 返回中文列头定义 + 数据行；金额列仍以「分」返回，导出时再转元。
   */
  async query(scope: RequestScope, type: ReportType, params: ReportQueryDto) {
    const range = this.resolveRange(params);
    switch (type) {
      case ReportType.SALES:
        return this.querySales(scope, params, range);
      case ReportType.INVENTORY_LOSS:
        return this.queryInventoryLoss(scope, params, range);
      case ReportType.COMMISSION_DETAIL:
        return this.queryCommissionDetail(scope, params, range);
      case ReportType.SETTLEMENT_STATEMENT:
        return this.querySettlementStatement(scope, params, range);
      case ReportType.DELIVERY_FEE:
        return this.queryDeliveryFee(scope, params, range);
      case ReportType.REFUND_DETAIL:
        return this.queryRefundDetail(scope, params, range);
      case ReportType.PRODUCT_TURNOVER:
        return this.queryProductTurnover(scope, params, range);
      case ReportType.PRESALE_STATS:
        return this.queryPresaleStats(scope, params, range);
      default:
        throw new BadRequestException(`不支持的报表类型：${type}`);
    }
  }

  /** 导出 Excel，写 report_exports 记录，返回流与逻辑 fileUrl */
  async export(scope: RequestScope, type: ReportType, params: ReportQueryDto, user: JwtPayload) {
    let result: ReportResult;
    try {
      result = await this.query(scope, type, params);
    } catch (error) {
      await this.writeExportRecord(scope, type, params, user, ReportExportStatus.FAILED, null, 0);
      throw error;
    }

    const buffer = await buildExcelBuffer([
      {
        name: REPORT_SHEET_NAMES[type] ?? type,
        columns: result.columns,
        rows: result.rows,
      },
    ]);
    const fileUrl = `reports/${type}-${Date.now()}.xlsx`;
    await this.writeExportRecord(
      scope,
      type,
      params,
      user,
      ReportExportStatus.DONE,
      fileUrl,
      result.rows.length,
    );
    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId: scope.tenantId,
        userId: user.sub,
        action: 'report.export',
        target: `ReportType:${type}`,
        detail: JSON.stringify({ params, rowCount: result.rows.length, fileUrl }),
      }),
    );

    return {
      fileUrl,
      filename: excelFilename(type),
      rowCount: result.rows.length,
      buffer,
    };
  }

  /** 导出历史 */
  async findExports(scope: RequestScope, limit = 50) {
    return this.exportRepo.find({
      where: { tenantId: scope.tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  /** 操作审计日志 */
  async findAuditLogs(scope: RequestScope, query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId: scope.tenantId });
    if (query.action) qb.andWhere('a.action = :action', { action: query.action });
    if (query.userId) qb.andWhere('a.user_id = :userId', { userId: query.userId });
    if (query.startDate) qb.andWhere('a.created_at >= :start', { start: new Date(query.startDate) });
    if (query.endDate) {
      qb.andWhere('a.created_at < :end', {
        end: new Date(new Date(query.endDate).getTime() + DAY_MS),
      });
    }
    const [rows, total] = await qb
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { total, page, limit, items: rows };
  }

  /** Webhook 订阅（同租户 + 事件 + 地址唯一，重复订阅重新启用） */
  async subscribeWebhook(scope: RequestScope, dto: WebhookSubscribeDto) {
    let subscription = await this.webhookRepo.findOne({
      where: {
        tenantId: scope.tenantId,
        event: dto.event,
        callbackUrl: dto.callbackUrl,
      },
    });
    if (!subscription) {
      subscription = this.webhookRepo.create({
        tenantId: scope.tenantId,
        event: dto.event,
        callbackUrl: dto.callbackUrl,
        status: Status.ENABLED,
      });
    } else {
      subscription.status = Status.ENABLED;
    }
    const saved = await this.webhookRepo.save(subscription);
    return {
      id: saved.id,
      event: saved.event,
      callbackUrl: saved.callbackUrl,
      status: saved.status,
    };
  }

  // ==================== 8 类报表 ====================

  /** 1. 销量：订单 + 订单明细 + SKU + 商品 + 花店 */
  private async querySales(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'orderNo', title: '订单号', width: 24 },
      { key: 'createdAt', title: '下单时间', width: 20 },
      { key: 'shopName', title: '花店' },
      { key: 'productName', title: '商品' },
      { key: 'skuId', title: 'SKU ID', width: 20 },
      { key: 'qty', title: '数量', type: 'number' },
      { key: 'retailPrice', title: '零售单价（元）', type: 'money' },
      { key: 'wholesalePrice', title: '批发单价（元）', type: 'money' },
      { key: 'amount', title: '小计（元）', type: 'money' },
      { key: 'orderStatus', title: '订单状态' },
    ];

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.order_no', 'orderNo')
      .addSelect('o.created_at', 'createdAt')
      .addSelect('s.name', 'shopName')
      .addSelect('p.name', 'productName')
      .addSelect('oi.sku_id', 'skuId')
      .addSelect('oi.qty', 'qty')
      .addSelect('COALESCE(oi.retail_price, 0)', 'retailPrice')
      .addSelect('COALESCE(oi.wholesale_price, 0)', 'wholesalePrice')
      .addSelect('(oi.qty * COALESCE(oi.wholesale_price, 0))', 'amount')
      .addSelect('o.status', 'orderStatus')
      .innerJoin(OrderItem, 'oi', 'oi.order_id = o.id AND oi.tenant_id = o.tenant_id')
      .leftJoin(ProductSku, 'sku', 'sku.id = oi.sku_id')
      .leftJoin(Product, 'p', 'p.id = sku.product_id')
      .leftJoin(Shop, 's', 's.id = o.shop_id')
      .where('o.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('o.created_at >= :start AND o.created_at < :end', range)
      .orderBy('o.created_at', 'DESC');
    this.applyOptionalFilters(qb, 'o', scope, params);

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return {
      columns,
      rows: rows.map((row) => ({
        ...row,
        createdAt: this.fmtDate(row.createdAt),
      })),
    };
  }

  /** 2. 库存损耗：损耗登记 + 库存流水 + SKU + 商品 + 花店 */
  private async queryInventoryLoss(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'lossId', title: '损耗单号', width: 20 },
      { key: 'createdAt', title: '登记时间', width: 20 },
      { key: 'shopName', title: '花店' },
      { key: 'skuId', title: 'SKU ID', width: 20 },
      { key: 'productName', title: '商品' },
      { key: 'qty', title: '损耗数量', type: 'number' },
      { key: 'reason', title: '损耗原因', width: 32 },
      { key: 'relatedLogs', title: '关联库存流水', width: 28 },
      { key: 'operatorId', title: '经办人 ID', width: 20 },
    ];

    const qb = this.lossRepo
      .createQueryBuilder('lr')
      .select('lr.id', 'lossId')
      .addSelect('lr.created_at', 'createdAt')
      .addSelect('s.name', 'shopName')
      .addSelect('lr.sku_id', 'skuId')
      .addSelect('p.name', 'productName')
      .addSelect('lr.qty', 'qty')
      .addSelect('lr.reason', 'reason')
      .addSelect('lr.operator_id', 'operatorId')
      .addSelect(
        `(SELECT GROUP_CONCAT(il.ref_no) FROM inventory_logs il
          WHERE il.tenant_id = lr.tenant_id AND il.sku_id = lr.sku_id
            AND il.change_type = 'loss'
            AND il.created_at >= lr.created_at
            AND il.created_at < DATE_ADD(lr.created_at, INTERVAL 1 DAY))`,
        'relatedLogs',
      )
      .leftJoin(ProductSku, 'sku', 'sku.id = lr.sku_id')
      .leftJoin(Product, 'p', 'p.id = sku.product_id')
      .leftJoin(Shop, 's', 's.id = lr.shop_id')
      .where('lr.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('lr.created_at >= :start AND lr.created_at < :end', range)
      .orderBy('lr.created_at', 'DESC');
    this.applyOptionalFilters(qb, 'lr', scope, params);

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return {
      columns,
      rows: rows.map((row) => ({ ...row, createdAt: this.fmtDate(row.createdAt) })),
    };
  }

  /** 3. 抽成明细：抽成 + 订单 + 花店 */
  private async queryCommissionDetail(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'orderNo', title: '订单号', width: 24 },
      { key: 'shopName', title: '花店' },
      { key: 'orderAmount', title: '订单金额（元）', type: 'money' },
      { key: 'deliveryFee', title: '配送费（元）', type: 'money' },
      { key: 'dimension', title: '抽成维度', width: 20 },
      { key: 'ratio', title: '抽成比例', type: 'number' },
      { key: 'amount', title: '抽成金额（元）', type: 'money' },
      { key: 'modeFlag', title: '分账/人工标识', width: 24 },
      { key: 'commissionStatus', title: '抽成状态', width: 20 },
      { key: 'createdAt', title: '产生时间', width: 20 },
    ];

    const qb = this.commissionRepo
      .createQueryBuilder('cd')
      .select('cd.order_no', 'orderNo')
      .addSelect('s.name', 'shopName')
      .addSelect('COALESCE(cd.order_amount, 0)', 'orderAmount')
      .addSelect('COALESCE(cd.delivery_fee, 0)', 'deliveryFee')
      .addSelect('cd.dimension', 'dimension')
      .addSelect('COALESCE(cd.ratio, 0)', 'ratio')
      .addSelect('COALESCE(cd.amount, 0)', 'amount')
      .addSelect('cd.mode_flag', 'modeFlag')
      .addSelect('cd.status', 'commissionStatus')
      .addSelect('cd.created_at', 'createdAt')
      .leftJoin(Order, 'o', 'o.order_no = cd.order_no AND o.tenant_id = cd.tenant_id')
      .leftJoin(Shop, 's', 's.id = cd.shop_id')
      .where('cd.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('cd.created_at >= :start AND cd.created_at < :end', range)
      .orderBy('cd.created_at', 'DESC');
    this.applyOptionalFilters(qb, 'cd', scope, params);

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return {
      columns,
      rows: rows.map((row) => ({
        ...row,
        dimension: DIMENSION_LABELS[row.dimension] ?? row.dimension,
        createdAt: this.fmtDate(row.createdAt),
      })),
    };
  }

  /** 4. 周期对账单：对账单主表 + 花店 */
  private async querySettlementStatement(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'statementNo', title: '对账单号', width: 28 },
      { key: 'shopName', title: '花店' },
      { key: 'cycle', title: '周期类型', width: 16 },
      { key: 'periodStart', title: '周期开始', width: 20 },
      { key: 'periodEnd', title: '周期结束', width: 20 },
      { key: 'orderAmount', title: '对账总额（元）', type: 'money' },
      { key: 'commissionAmount', title: '抽成金额（元）', type: 'money' },
      { key: 'netAmount', title: '净结算金额（元）', type: 'money' },
      { key: 'status', title: '对账状态', width: 20 },
    ];

    const qb = this.statementRepo
      .createQueryBuilder('st')
      .select(
        "CONCAT(st.cycle, '-', DATE_FORMAT(st.period_start, '%Y%m%d'), '-', st.shop_id)",
        'statementNo',
      )
      .addSelect('s.name', 'shopName')
      .addSelect('st.cycle', 'cycle')
      .addSelect('st.period_start', 'periodStart')
      .addSelect('st.period_end', 'periodEnd')
      .addSelect('COALESCE(st.total_amount, 0)', 'orderAmount')
      .addSelect('COALESCE(st.commission_amount, 0)', 'commissionAmount')
      .addSelect(
        'COALESCE(st.total_amount, 0) - COALESCE(st.commission_amount, 0)',
        'netAmount',
      )
      .addSelect('st.status', 'status')
      .leftJoin(Shop, 's', 's.id = st.shop_id')
      .where('st.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('st.period_end > :start AND st.period_start < :end', range)
      .orderBy('st.period_start', 'DESC');
    this.applyOptionalFilters(qb, 'st', scope, params);

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return {
      columns,
      rows: rows.map((row) => ({
        ...row,
        periodStart: this.fmtDate(row.periodStart),
        periodEnd: this.fmtDate(row.periodEnd),
      })),
    };
  }

  /** 5. 配送费明细：运单 + 订单 + 抽成关联（含费用拆解 JSON） */
  private async queryDeliveryFee(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'orderNo', title: '订单号', width: 24 },
      { key: 'method', title: '配送方式', width: 18 },
      { key: 'area', title: '配送区域' },
      { key: 'weight', title: '重量（kg）', type: 'number' },
      { key: 'surcharge', title: '金额加价（元）', type: 'money' },
      { key: 'discount', title: '满额减免（元）', type: 'money' },
      { key: 'actualFee', title: '实收配送费（元）', type: 'money' },
      { key: 'inCommission', title: '是否参与抽成', width: 18 },
      { key: 'trackingNo', title: '运单号', width: 24 },
    ];

    const qb = this.shipmentRepo
      .createQueryBuilder('sh')
      .select('o.order_no', 'orderNo')
      .addSelect('sh.method', 'method')
      .addSelect('sh.weight', 'weight')
      .addSelect('sh.fee_breakdown', 'feeBreakdown')
      .addSelect('COALESCE(o.delivery_fee, 0)', 'orderFee')
      .addSelect('sh.tracking_no', 'trackingNo')
      .addSelect(
        `EXISTS (SELECT 1 FROM commission_details cd
          WHERE cd.tenant_id = sh.tenant_id AND cd.order_no = o.order_no
            AND cd.dimension = '${CommissionDimension.DELIVERY_METHOD}')`,
        'inCommission',
      )
      .innerJoin(Order, 'o', 'o.id = sh.order_id AND o.tenant_id = sh.tenant_id')
      .where('sh.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('sh.created_at >= :start AND sh.created_at < :end', range)
      .orderBy('sh.created_at', 'DESC');
    this.applyOptionalFilters(qb, 'sh', scope, params);

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return {
      columns,
      rows: rows.map((row) => {
        const breakdown = this.parseFeeBreakdown(row.feeBreakdown);
        return {
          orderNo: row.orderNo,
          method: DELIVERY_LABELS[row.method] ?? row.method,
          area: breakdown.area ?? '',
          weight: Number(row.weight ?? 0),
          surcharge: breakdown.surcharge ?? 0,
          discount: breakdown.discount ?? 0,
          actualFee: breakdown.actualFee ?? Number(row.orderFee ?? 0),
          inCommission: Number(row.inCommission) === 1 ? '是' : '否',
          trackingNo: row.trackingNo ?? '',
        };
      }),
    };
  }

  /** 6. 退款明细：退款单 + 原订单 + 花店 */
  private async queryRefundDetail(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'refundNo', title: '退款单号', width: 24 },
      { key: 'orderNo', title: '原订单号', width: 24 },
      { key: 'shopName', title: '花店' },
      { key: 'refundType', title: '退款类型', width: 16 },
      { key: 'amount', title: '退款金额（元）', type: 'money' },
      { key: 'inventoryStatus', title: '库存处理状态', width: 20 },
      { key: 'rollbackStatus', title: '分账回退状态', width: 20 },
      { key: 'createdAt', title: '申请时间', width: 20 },
    ];

    const qb = this.refundRepo
      .createQueryBuilder('r')
      .select('r.refund_no', 'refundNo')
      .addSelect('o.order_no', 'orderNo')
      .addSelect('s.name', 'shopName')
      .addSelect('r.type', 'refundType')
      .addSelect('COALESCE(r.amount, 0)', 'amount')
      .addSelect('r.inventory_status', 'inventoryStatus')
      .addSelect('r.profit_share_rollback_status', 'rollbackStatus')
      .addSelect('r.created_at', 'createdAt')
      .leftJoin(Order, 'o', 'o.id = r.order_id AND o.tenant_id = r.tenant_id')
      .leftJoin(Shop, 's', 's.id = r.shop_id')
      .where('r.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('r.created_at >= :start AND r.created_at < :end', range)
      .orderBy('r.created_at', 'DESC');
    this.applyOptionalFilters(qb, 'r', scope, params);

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return {
      columns,
      rows: rows.map((row) => ({ ...row, createdAt: this.fmtDate(row.createdAt) })),
    };
  }

  /** 7. 商品动销：订单明细 + 订单 + SKU + 商品 */
  private async queryProductTurnover(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'skuId', title: 'SKU ID', width: 20 },
      { key: 'productName', title: '商品' },
      { key: 'salesQty', title: '销量', type: 'number' },
      { key: 'salesAmount', title: '销售额（元）', type: 'money' },
      { key: 'turnoverDays', title: '动销天数', type: 'number' },
      { key: 'orderCount', title: '成交订单数', type: 'number' },
    ];

    const qb = this.itemRepo
      .createQueryBuilder('oi')
      .select('oi.sku_id', 'skuId')
      .addSelect('oi.product_name', 'productName')
      .addSelect('SUM(oi.qty)', 'salesQty')
      .addSelect('SUM(oi.qty * COALESCE(oi.wholesale_price, 0))', 'salesAmount')
      .addSelect('COUNT(DISTINCT DATE(o.created_at))', 'turnoverDays')
      .addSelect('COUNT(DISTINCT o.id)', 'orderCount')
      .innerJoin(Order, 'o', 'o.id = oi.order_id AND o.tenant_id = oi.tenant_id')
      .where('oi.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('o.created_at >= :start AND o.created_at < :end', range)
      .groupBy('oi.sku_id')
      .addGroupBy('oi.product_name')
      .orderBy('SUM(oi.qty)', 'DESC');

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return { columns, rows };
  }

  /** 8. 节日预售统计：预售活动 + 商品 + 花店 */
  private async queryPresaleStats(
    scope: RequestScope,
    params: ReportQueryDto,
    range: { start: Date; end: Date },
  ): Promise<ReportResult> {
    const columns: ReportColumn[] = [
      { key: 'skuId', title: 'SKU ID', width: 20 },
      { key: 'productName', title: '商品' },
      { key: 'festival', title: '预售月份', width: 16 },
      { key: 'startTime', title: '预售开始', width: 20 },
      { key: 'endTime', title: '预售结束', width: 20 },
      { key: 'depositAmount', title: '定金（元）', type: 'money' },
      { key: 'balanceAmount', title: '尾款（元）', type: 'money' },
      { key: 'status', title: '活动状态', width: 16 },
    ];

    // Presale 只有 skuId / supplierId，无 shopId；按租户+批发商过滤，商品名经 SKU 反查
    const qb = this.presaleRepo
      .createQueryBuilder('ps')
      .select('ps.sku_id', 'skuId')
      .addSelect('p.name', 'productName')
      .addSelect('ps.start_at', 'startTime')
      .addSelect('ps.end_at', 'endTime')
      .addSelect('COALESCE(ps.deposit, 0)', 'depositAmount')
      .addSelect('COALESCE(ps.balance, 0)', 'balanceAmount')
      .addSelect('ps.status', 'status')
      .leftJoin(ProductSku, 'sku', 'sku.id = ps.sku_id AND sku.tenant_id = ps.tenant_id')
      .leftJoin(Product, 'p', 'p.id = sku.product_id AND p.tenant_id = ps.tenant_id')
      .where('ps.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('ps.start_at < :end AND ps.end_at >= :start', range)
      .orderBy('ps.start_at', 'DESC');
    if (scope.supplierId) {
      qb.andWhere('ps.supplier_id = :supplierId', { supplierId: scope.supplierId });
    }

    const rows = await this.paginate(qb, params).getRawMany<Record<string, any>>();
    return {
      columns,
      rows: rows.map((row) => ({
        skuId: row.skuId,
        productName: row.productName ?? '',
        festival: this.fmtDate(row.startTime).slice(0, 7),
        startTime: this.fmtDate(row.startTime),
        endTime: this.fmtDate(row.endTime),
        depositAmount: row.depositAmount,
        balanceAmount: row.balanceAmount,
        status: Number(row.status) === 1 ? '启用' : '停用',
      })),
    };
  }

  // ==================== 内部辅助 ====================

  /** 默认统计区间：当月 1 日 00:00 至次日 00:00（左闭右开） */
  private resolveRange(params: ReportQueryDto): { start: Date; end: Date } {
    const now = new Date();
    const start = params.startDate
      ? new Date(params.startDate)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = params.endDate
      ? new Date(
          new Date(params.endDate).getTime() +
            (params.endDate.length === 10 ? DAY_MS : 0),
        )
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('日期范围不合法');
    }
    return { start, end };
  }

  /** 作用域过滤：租户必带，批发商/花店按身份下钻；禁止客户端传租户字段 */
  private applyOptionalFilters<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    scope: RequestScope,
    params: ReportQueryDto,
  ): void {
    if (scope.supplierId) {
      qb.andWhere(`${alias}.supplier_id = :supplierId`, { supplierId: scope.supplierId });
    }
    const shopId = scope.shopId ?? params.shopId;
    if (shopId) qb.andWhere(`${alias}.shop_id = :shopId`, { shopId });
  }

  private paginate<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    params: ReportQueryDto,
  ): SelectQueryBuilder<T> {
    return qb.take(params.limit ?? 1000).skip(params.offset ?? 0);
  }

  private fmtDate(value: unknown): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toISOString().slice(0, 19).replace('T', ' ');
  }

  private parseFeeBreakdown(raw: string | null): Record<string, any> {
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }

  private async writeExportRecord(
    scope: RequestScope,
    type: ReportType,
    params: ReportQueryDto,
    user: JwtPayload,
    status: ReportExportStatus,
    fileUrl: string | null,
    rowCount: number,
  ): Promise<void> {
    await this.exportRepo.save(
      this.exportRepo.create({
        tenantId: scope.tenantId,
        reportCode: type,
        params: JSON.stringify(params ?? {}),
        fileUrl,
        status,
        operatorId: user.sub,
        rowCount,
      }),
    );
  }
}
