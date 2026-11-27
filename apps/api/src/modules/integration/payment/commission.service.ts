import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionDimension, SettlementMode, Status } from '@flower/shared';
import { CommissionRule } from '../../../database/entities/commission-rule.entity';
import { SettlementConfig } from '../../../database/entities/settlement-config.entity';

export interface CommissionContext {
  tenantId: string;
  supplierId: string;
  shopId: string;
  /** 订单商品金额，整数分 */
  orderAmount: number;
  /** 配送费，整数分 */
  deliveryFee?: number;
  deliveryMethod?: string;
  categoryId?: string;
}

export interface CommissionResult {
  /** 有效抽成比例 0~1 */
  ratio: number;
  /** 抽成金额，整数分 */
  amount: number;
  dimension: CommissionDimension;
  ruleId?: string;
  /** 本次是否把配送费计入抽成基数 */
  deliveryFeeIncluded: boolean;
  baseAmount: number;
}

/**
 * 抽成计算：按 dimension 匹配规则，priority 降序生效；
 * 同一 mutexGroup 仅取优先级最高的一条，不同组可叠加，总比例封顶 1。
 * 配送费是否参与抽成读取逐花店 settlement_configs。
 */
@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepo: Repository<CommissionRule>,
    @InjectRepository(SettlementConfig)
    private readonly configRepo: Repository<SettlementConfig>,
  ) {}

  async getConfig(
    tenantId: string,
    supplierId: string,
    shopId: string,
  ): Promise<SettlementConfig | null> {
    return this.configRepo.findOne({ where: { tenantId, supplierId, shopId } });
  }

  /** 未配置时默认人工结算（不受 30% 限制） */
  async getMode(tenantId: string, supplierId: string, shopId: string): Promise<SettlementMode> {
    const config = await this.getConfig(tenantId, supplierId, shopId);
    return config?.mode ?? SettlementMode.MANUAL;
  }

  async calculate(ctx: CommissionContext): Promise<CommissionResult> {
    const config = await this.getConfig(ctx.tenantId, ctx.supplierId, ctx.shopId);
    const rules = await this.ruleRepo.find({
      where: { tenantId: ctx.tenantId, supplierId: ctx.supplierId, status: Status.ENABLED },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });

    const usedGroups = new Set<string>();
    let ratio = 0;
    let dimension = CommissionDimension.ORDER_RATIO;
    let ruleId: string | undefined;
    for (const rule of rules) {
      if (!this.matches(rule, ctx)) continue;
      if (rule.mutexGroup) {
        if (usedGroups.has(rule.mutexGroup)) continue;
        usedGroups.add(rule.mutexGroup);
      }
      if (ruleId === undefined) {
        ruleId = rule.id;
        dimension = rule.dimension;
      }
      ratio += Number(rule.ratio);
    }
    ratio = Math.max(0, Math.min(ratio, 1));

    const deliveryFee = Number(ctx.deliveryFee ?? 0);
    const deliveryFeeIncluded = config?.deliveryFeeInCommission === true;
    const baseAmount = Number(ctx.orderAmount) + (deliveryFeeIncluded ? deliveryFee : 0);
    return {
      ratio,
      amount: Math.round(baseAmount * ratio),
      dimension,
      ruleId,
      deliveryFeeIncluded,
      baseAmount,
    };
  }

  /**
   * 当前规则下该花店可能达到的最大抽成比例（切换为 profit_share 前的 30% 校验依据）。
   * 每条 mutexGroup 取组内最大值，不同组叠加，封顶 1。
   */
  async getMaxRatio(tenantId: string, supplierId: string, shopId: string): Promise<number> {
    const rules = await this.ruleRepo.find({
      where: { tenantId, supplierId, status: Status.ENABLED },
    });
    const bestByGroup = new Map<string, number>();
    for (const rule of rules) {
      if (!this.applicableToShop(rule, shopId)) continue;
      const key = rule.mutexGroup || `__rule_${rule.id}`;
      const value = Number(rule.ratio);
      bestByGroup.set(key, Math.max(bestByGroup.get(key) ?? 0, value));
    }
    let total = 0;
    for (const value of bestByGroup.values()) total += value;
    return Math.max(0, Math.min(total, 1));
  }

  private matches(rule: CommissionRule, ctx: CommissionContext): boolean {
    const target = rule.targetValue?.trim() ?? '';
    switch (rule.dimension) {
      case CommissionDimension.ORDER_RATIO:
        return true;
      case CommissionDimension.DELIVERY_METHOD:
        return !target || target === ctx.deliveryMethod;
      case CommissionDimension.SHOP:
        return !target || target === ctx.shopId;
      case CommissionDimension.CATEGORY:
        return Boolean(ctx.categoryId) && (!target || target === ctx.categoryId);
      default:
        return false;
    }
  }

  private applicableToShop(rule: CommissionRule, shopId: string): boolean {
    if (rule.dimension !== CommissionDimension.SHOP) return true;
    const target = rule.targetValue?.trim() ?? '';
    return !target || target === shopId;
  }
}
