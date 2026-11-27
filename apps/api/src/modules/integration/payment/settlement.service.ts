import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CommissionDimension,
  DEFAULT_PLATFORM_TENANT_ID,
  PROFIT_SHARE_MAX_RATIO,
  PaymentStatus,
  ProfitShareStatus,
  RefundType,
  SettlementMode,
  Status,
} from '@flower/shared';
import { RequestScope } from '../../../common/interfaces/jwt-payload.interface';
import { Payment } from '../../../database/entities/payment.entity';
import { PaymentCallback } from '../../../database/entities/payment-callback.entity';
import { Refund } from '../../../database/entities/refund.entity';
import { CommissionRule } from '../../../database/entities/commission-rule.entity';
import { SettlementConfig } from '../../../database/entities/settlement-config.entity';
import { ProfitShareOrder } from '../../../database/entities/profit-share-order.entity';
import { CommissionDetail } from '../../../database/entities/commission-detail.entity';
import { SettlementStatement } from '../../../database/entities/settlement-statement.entity';
import { SettlementStatementItem } from '../../../database/entities/settlement-statement-item.entity';
import {
  PAYMENT_SERVICE,
  PaymentHeaders,
  PaymentRefundParams,
  PaymentService,
} from './payment.service';
import { PROFIT_SHARE_SERVICE, ProfitShareService } from './profit-share.service';
import { CommissionService } from './commission.service';

interface PrepayInput {
  orderId: string;
  amount: number;
  subject?: string;
}

interface RefundInput {
  orderId: string;
  amount: number;
  reason: string;
}

interface CreateRuleInput {
  dimension: CommissionDimension;
  targetValue?: string;
  ratio: number;
  priority: number;
  mutexGroup?: string;
  status?: number;
}

interface UpdateRuleInput extends Partial<CreateRuleInput> {}

interface UpdateConfigInput {
  mode: SettlementMode;
  deliveryFeeInCommission: boolean;
}

interface ProfitShareInput {
  paymentId: string;
  receiver?: string;
  deliveryFee?: number;
  deliveryMethod?: string;
  categoryId?: string;
}

interface CommissionDetailFilter {
  dimension?: CommissionDimension;
  orderNo?: string;
}

type RefundRoute = 'pre_share' | 'post_share' | 'manual_offset';

/**
 * M5 结算核心业务：支付回调幂等、30% 铁律、分账、退款路由与抽成明细。
 * 所有查询均带 tenantId / supplierId / shopId 范围过滤。
 */
@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentCallback)
    private readonly callbackRepo: Repository<PaymentCallback>,
    @InjectRepository(Refund) private readonly refundRepo: Repository<Refund>,
    @InjectRepository(CommissionRule) private readonly ruleRepo: Repository<CommissionRule>,
    @InjectRepository(SettlementConfig)
    private readonly configRepo: Repository<SettlementConfig>,
    @InjectRepository(ProfitShareOrder)
    private readonly shareRepo: Repository<ProfitShareOrder>,
    @InjectRepository(CommissionDetail)
    private readonly detailRepo: Repository<CommissionDetail>,
    @InjectRepository(SettlementStatement)
    private readonly statementRepo: Repository<SettlementStatement>,
    @InjectRepository(SettlementStatementItem)
    private readonly itemRepo: Repository<SettlementStatementItem>,
    @Inject(PAYMENT_SERVICE) private readonly paymentProvider: PaymentService,
    @Inject(PROFIT_SHARE_SERVICE) private readonly shareProvider: ProfitShareService,
    private readonly commissionService: CommissionService,
  ) {}

  // ---------------- 支付 ----------------

  /** 发起支付：金额由订单模块传入（整数分），生成本地支付单后调用渠道预支付。 */
  async prepay(scope: RequestScope, input: PrepayInput) {
    if (!scope.supplierId || !scope.shopId) {
      throw new BadRequestException('缺少批发商或花店作用域，无法发起支付');
    }
    const amount = Number(input.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('支付金额必须为大于 0 的整数分');
    }
    const outTradeNo = this.genNo('P');
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenantId: scope.tenantId,
        supplierId: scope.supplierId,
        shopId: scope.shopId,
        outTradeNo,
        orderId: input.orderId,
        amount,
        status: PaymentStatus.PENDING,
      }),
    );
    const prepay = await this.paymentProvider.prepay({
      tenantId: scope.tenantId,
      supplierId: scope.supplierId,
      shopId: scope.shopId,
      orderId: input.orderId,
      outTradeNo,
      amount,
      subject: input.subject,
    });
    return { paymentId: payment.id, outTradeNo, amount, ...prepay };
  }

  /**
   * 支付回调。先验签，再以 INSERT IGNORE 抢占 (out_trade_no,event_type) 唯一键：
   * 抢不到的重复回调直接返回成功，不重复驱动业务状态。
   */
  async handlePaymentCallback(rawBody: string, headers: PaymentHeaders) {
    const verified = await this.paymentProvider.verifyCallback(rawBody, headers);
    const eventType = this.extractEventType(rawBody);
    const payment = await this.paymentRepo.findOne({
      where: { outTradeNo: verified.outTradeNo },
    });
    const tenantId = payment?.tenantId ?? String(DEFAULT_PLATFORM_TENANT_ID);

    const insert = await this.callbackRepo
      .createQueryBuilder()
      .insert()
      .into(PaymentCallback)
      .values({
        tenantId,
        outTradeNo: verified.outTradeNo,
        eventType,
        rawBody,
        verified: false,
        processed: false,
        error: null,
      })
      .orIgnore()
      .execute();
    if (Number(insert.raw?.affectedRows ?? 0) === 0) {
      return { received: true, duplicate: true, outTradeNo: verified.outTradeNo };
    }

    if (!payment) {
      await this.callbackRepo.update(
        { outTradeNo: verified.outTradeNo, eventType },
        { error: '未找到对应支付单' },
      );
      return { received: true, ignored: true, outTradeNo: verified.outTradeNo };
    }
    if (Number(verified.amount) !== Number(payment.amount)) {
      await this.callbackRepo.update(
        { outTradeNo: verified.outTradeNo, eventType },
        { error: '回调金额与支付单金额不一致' },
      );
      throw new BadRequestException('回调金额与支付单金额不一致');
    }

    if (payment.status === PaymentStatus.PENDING) {
      await this.paymentRepo.update(
        { id: payment.id, status: PaymentStatus.PENDING },
        {
          status: PaymentStatus.SUCCESS,
          transactionId: verified.transactionId,
          paidAt: new Date(),
          rawCallback: rawBody,
        },
      );
    }
    await this.callbackRepo.update(
      { outTradeNo: verified.outTradeNo, eventType },
      { verified: true, processed: true },
    );
    return { received: true, duplicate: false, outTradeNo: verified.outTradeNo };
  }

  async findPayment(id: string, scope: RequestScope): Promise<Payment> {
    const where: Record<string, unknown> = { id, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;
    const payment = await this.paymentRepo.findOne({ where });
    if (!payment) throw new NotFoundException('支付单不存在');
    return payment;
  }

  // ---------------- 退款路由 ----------------

  /**
   * 退款路由：
   * - profit_share 且无 SUCCESS 分账 → 冻结资金直接退（pre_share）；
   * - profit_share 且已分账 → 接收方同意回退，freezeUntil+180 天窗口内执行（post_share）；
   * - manual → 渠道退款并在周期对账单冲抵（manual_offset）。
   */
  async createRefund(scope: RequestScope, input: RefundInput) {
    const payment = await this.paymentRepo.findOne({
      where: { tenantId: scope.tenantId, orderId: input.orderId },
      order: { createdAt: 'DESC' },
    });
    if (!payment) throw new NotFoundException('订单对应的支付单不存在');
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('支付单未支付成功，不能发起退款');
    }
    const amount = Number(input.amount);
    if (
      !Number.isInteger(amount) ||
      amount <= 0 ||
      amount > Number(payment.amount)
    ) {
      throw new BadRequestException('退款金额不合法');
    }

    const refundNo = this.genNo('R');
    const mode = await this.commissionService.getMode(
      payment.tenantId,
      payment.supplierId,
      payment.shopId,
    );
    let route: RefundRoute;

    if (mode === SettlementMode.PROFIT_SHARE) {
      const successShares = await this.shareRepo.find({
        where: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
          status: ProfitShareStatus.SUCCESS,
        },
      });
      if (successShares.length === 0) {
        route = 'pre_share';
      } else {
        const deadline = this.rollbackDeadline(payment, successShares);
        if (new Date() > deadline) {
          throw new BadRequestException('超过分账回退180天窗口，需人工处理');
        }
        for (const share of successShares) {
          const rollback = await this.shareProvider.rollback({
            tenantId: payment.tenantId,
            supplierId: payment.supplierId,
            shopId: payment.shopId,
            paymentId: payment.id,
            profitShareOrderId: share.id,
            receiver: share.receiver,
            amount: Number(share.amount),
            refundNo,
          });
          if (rollback.status === ProfitShareStatus.ROLLBACK) {
            await this.shareRepo.update({ id: share.id }, { status: ProfitShareStatus.ROLLBACK });
          } else {
            throw new BadRequestException('接收方未同意分账回退，需人工处理');
          }
        }
        route = 'post_share';
      }
    } else {
      route = 'manual_offset';
    }

    const params: PaymentRefundParams = {
      tenantId: payment.tenantId,
      outTradeNo: payment.outTradeNo,
      refundNo,
      amount,
      reason: input.reason,
    };
    const refund = await this.paymentProvider.refund(params);
    await this.refundRepo.save(
      this.refundRepo.create({
        tenantId: payment.tenantId,
        supplierId: payment.supplierId,
        shopId: payment.shopId,
        refundNo,
        orderId: payment.orderId,
        type: amount >= Number(payment.amount) ? RefundType.FULL : RefundType.PARTIAL,
        amount,
        reason: input.reason,
        status: 'success',
        inventoryStatus: null,
        profitShareRollbackStatus:
          route === 'post_share' ? 'rolled_back' : route === 'pre_share' ? 'not_required' : 'manual_offset',
      }),
    );
    await this.recordRefund(payment, refundNo, amount, route, input.reason, mode);
    if (amount >= Number(payment.amount)) {
      await this.paymentRepo.update({ id: payment.id }, { status: PaymentStatus.REFUNDED });
    }
    return { ...refund, route, mode, orderId: payment.orderId };
  }

  /** 退款回调：查询渠道退款状态并落库，公开接口无需登录。 */
  async refundCallback(body: Record<string, unknown>) {
    const refundNo = String(body['refundNo'] ?? body['out_refund_no'] ?? '');
    const outTradeNo = String(body['outTradeNo'] ?? body['out_trade_no'] ?? '');
    if (!refundNo && !outTradeNo) return { received: true, ignored: true };

    const result = await this.paymentProvider.query(refundNo || outTradeNo);
    const payment = outTradeNo
      ? await this.paymentRepo.findOne({ where: { outTradeNo } })
      : null;
    if (payment && result.status === 'success') {
      await this.paymentRepo.update({ id: payment.id }, { status: PaymentStatus.REFUNDED });
      await this.detailRepo.update(
        { tenantId: payment.tenantId, orderNo: payment.outTradeNo, status: 'refund' },
        { status: 'refund_success' },
      );
    }
    return { received: true, ...result };
  }

  // ---------------- 分账 ----------------

  /** 发起分账：仅 profit_share 模式可用，且必须经过 30% 铁律校验。 */
  async initiateProfitShare(scope: RequestScope, input: ProfitShareInput) {
    const payment = await this.paymentRepo.findOne({
      where: { id: input.paymentId, tenantId: scope.tenantId },
    });
    if (!payment) throw new NotFoundException('支付单不存在');
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('支付单未支付成功，不能发起分账');
    }
    const mode = await this.commissionService.getMode(
      payment.tenantId,
      payment.supplierId,
      payment.shopId,
    );
    if (mode !== SettlementMode.PROFIT_SHARE) {
      throw new BadRequestException('当前花店为人工结算模式，不可发起分账');
    }

    const calc = await this.commissionService.calculate({
      tenantId: payment.tenantId,
      supplierId: payment.supplierId,
      shopId: payment.shopId,
      orderAmount: Number(payment.amount),
      deliveryFee: input.deliveryFee,
      deliveryMethod: input.deliveryMethod,
      categoryId: input.categoryId,
    });
    this.assertProfitShareRatio(calc.ratio);

    const receiver = input.receiver || `mock_receiver_${payment.shopId}`;
    const freezeUntil = new Date(
      (payment.paidAt ?? payment.createdAt).getTime() + this.dayMs(30),
    );
    const shareOrder = await this.shareRepo.save(
      this.shareRepo.create({
        tenantId: payment.tenantId,
        supplierId: payment.supplierId,
        shopId: payment.shopId,
        paymentId: payment.id,
        orderId: payment.orderId,
        receiver,
        amount: calc.amount,
        ratio: calc.ratio,
        freezeUntil,
        status: ProfitShareStatus.PENDING,
      }),
    );
    const result = await this.shareProvider.share({
      tenantId: payment.tenantId,
      supplierId: payment.supplierId,
      shopId: payment.shopId,
      paymentId: payment.id,
      profitShareOrderId: shareOrder.id,
      outTradeNo: payment.outTradeNo,
      receiver,
      amount: calc.amount,
    });
    const finalStatus =
      result.status === ProfitShareStatus.SUCCESS
        ? ProfitShareStatus.SUCCESS
        : ProfitShareStatus.FAILED;
    await this.shareRepo.update({ id: shareOrder.id }, { status: finalStatus });
    await this.detailRepo.save(
      this.detailRepo.create({
        tenantId: payment.tenantId,
        supplierId: payment.supplierId,
        shopId: payment.shopId,
        orderNo: payment.outTradeNo,
        orderId: payment.orderId,
        orderAmount: Number(payment.amount),
        deliveryFee: calc.deliveryFeeIncluded ? calc.baseAmount - Number(payment.amount) : 0,
        dimension: calc.dimension,
        ratio: calc.ratio,
        amount: calc.amount,
        modeFlag: 'profit_share',
        status: finalStatus === ProfitShareStatus.SUCCESS ? 'shared' : 'failed',
      }),
    );
    return { ...result, profitShareOrderId: shareOrder.id, status: finalStatus };
  }

  async listProfitShareOrders(scope: RequestScope) {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;
    return this.shareRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ---------------- 规则 / 配置 / 报表 ----------------

  async listCommissionRules(scope: RequestScope) {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    return this.ruleRepo.find({ where, order: { priority: 'DESC' } });
  }

  async findCommissionRule(scope: RequestScope, id: string): Promise<CommissionRule> {
    return this.getRuleInScope(id, scope);
  }

  async createCommissionRule(scope: RequestScope, input: CreateRuleInput) {
    if (!scope.supplierId) throw new BadRequestException('缺少批发商作用域');
    const ratio = Number(input.ratio);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      throw new BadRequestException('抽成比例必须在 0~1 之间');
    }
    return this.ruleRepo.save(
      this.ruleRepo.create({
        tenantId: scope.tenantId,
        supplierId: scope.supplierId,
        dimension: input.dimension,
        targetValue: input.targetValue ?? null,
        ratio,
        priority: Number(input.priority ?? 0),
        mutexGroup: input.mutexGroup ?? null,
        status: input.status ?? Status.ENABLED,
      }),
    );
  }

  async updateCommissionRule(scope: RequestScope, id: string, input: UpdateRuleInput) {
    const rule = await this.getRuleInScope(id, scope);
    if (input.ratio !== undefined) {
      const ratio = Number(input.ratio);
      if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
        throw new BadRequestException('抽成比例必须在 0~1 之间');
      }
      rule.ratio = ratio;
    }
    if (input.dimension !== undefined) rule.dimension = input.dimension;
    if (input.targetValue !== undefined) rule.targetValue = input.targetValue ?? null;
    if (input.priority !== undefined) rule.priority = Number(input.priority);
    if (input.mutexGroup !== undefined) rule.mutexGroup = input.mutexGroup ?? null;
    if (input.status !== undefined) rule.status = Number(input.status);
    return this.ruleRepo.save(rule);
  }

  async getSettlementConfig(scope: RequestScope, shopId: string) {
    if (!scope.supplierId) throw new BadRequestException('缺少批发商作用域');
    const config = await this.configRepo.findOne({
      where: {
        tenantId: scope.tenantId,
        supplierId: scope.supplierId,
        shopId,
      },
    });
    return (
      config ?? {
        tenantId: scope.tenantId,
        supplierId: scope.supplierId,
        shopId,
        mode: SettlementMode.MANUAL,
        deliveryFeeInCommission: false,
      }
    );
  }

  /** 修改逐花店结算模式；切换为分账前按当前规则做 30% 铁律校验。 */
  async updateSettlementConfig(
    scope: RequestScope,
    shopId: string,
    input: UpdateConfigInput,
  ) {
    if (!scope.supplierId) throw new BadRequestException('缺少批发商作用域');
    if (input.mode === SettlementMode.PROFIT_SHARE) {
      const maxRatio = await this.commissionService.getMaxRatio(
        scope.tenantId,
        scope.supplierId,
        shopId,
      );
      this.assertProfitShareRatio(maxRatio);
    }
    let config = await this.configRepo.findOne({
      where: {
        tenantId: scope.tenantId,
        supplierId: scope.supplierId,
        shopId,
      },
    });
    if (!config) {
      config = this.configRepo.create({
        tenantId: scope.tenantId,
        supplierId: scope.supplierId,
        shopId,
        mode: input.mode,
        deliveryFeeInCommission: input.deliveryFeeInCommission,
      });
    } else {
      config.mode = input.mode;
      config.deliveryFeeInCommission = input.deliveryFeeInCommission;
    }
    return this.configRepo.save(config);
  }

  async listCommissionDetails(scope: RequestScope, filter: CommissionDetailFilter) {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;
    if (filter.dimension) where.dimension = filter.dimension;
    if (filter.orderNo) where.orderNo = filter.orderNo;
    return this.detailRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ---------------- 内部辅助 ----------------

  /** 30% 铁律：profit_share 模式下有效抽成超过上限即拒绝。manual 模式不调用此校验。 */
  assertProfitShareRatio(ratio: number): void {
    if (Number(ratio) > PROFIT_SHARE_MAX_RATIO) {
      throw new BadRequestException('抽成超过30%，必须切换为人工结算模式');
    }
  }

  private async getRuleInScope(id: string, scope: RequestScope): Promise<CommissionRule> {
    const where: Record<string, unknown> = { id, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    const rule = await this.ruleRepo.findOne({ where });
    if (!rule) throw new NotFoundException('抽成规则不存在');
    return rule;
  }

  private async recordRefund(
    payment: Payment,
    refundNo: string,
    amount: number,
    route: RefundRoute,
    reason: string,
    mode: SettlementMode,
  ): Promise<void> {
    await this.detailRepo.save(
      this.detailRepo.create({
        tenantId: payment.tenantId,
        supplierId: payment.supplierId,
        shopId: payment.shopId,
        orderNo: payment.outTradeNo,
        orderId: payment.orderId,
        orderAmount: Number(payment.amount),
        deliveryFee: 0,
        dimension: CommissionDimension.ORDER_RATIO,
        ratio: 0,
        amount: -amount,
        modeFlag: `refund:${route}`,
        status: 'refund',
      }),
    );
    if (mode === SettlementMode.MANUAL) {
      const statement = await this.statementRepo.findOne({
        where: {
          tenantId: payment.tenantId,
          supplierId: payment.supplierId,
          shopId: payment.shopId,
        },
        order: { periodEnd: 'DESC' },
      });
      if (statement) {
        await this.itemRepo.save(
          this.itemRepo.create({
            tenantId: payment.tenantId,
            supplierId: payment.supplierId,
            shopId: payment.shopId,
            statementId: statement.id,
            refType: 'refund',
            refNo: refundNo,
            amount: -amount,
            remark: reason,
          }),
        );
      }
    }
  }

  /** 回退窗口：最晚 freezeUntil（缺失则用 paidAt / createdAt）+180 天。 */
  private rollbackDeadline(payment: Payment, shares: ProfitShareOrder[]): Date {
    const freezeDates = shares
      .map((s) => s.freezeUntil)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime());
    const base = freezeDates[0] ?? payment.paidAt ?? payment.createdAt;
    return new Date(base.getTime() + this.dayMs(180));
  }

  private extractEventType(rawBody: string): string {
    try {
      const body = JSON.parse(rawBody) as Record<string, unknown>;
      const value = body['event_type'] ?? body['eventType'] ?? body['EventType'];
      return typeof value === 'string' && value ? value : 'payment.success';
    } catch {
      return 'payment.success';
    }
  }

  private genNo(prefix: string): string {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')}`;
  }

  private dayMs(days: number): number {
    return days * 24 * 60 * 60 * 1000;
  }
}
