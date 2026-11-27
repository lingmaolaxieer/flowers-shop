import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AfterSaleType, PromotionType, Status } from '@flower/shared';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { Combo } from '../../database/entities/combo.entity';
import { Coupon } from '../../database/entities/coupon.entity';
import { DailySpecial } from '../../database/entities/daily-special.entity';
import { DiscountRule } from '../../database/entities/discount-rule.entity';
import { MemberPrice } from '../../database/entities/member-price.entity';
import { PointsAccount } from '../../database/entities/points-account.entity';
import { PointsLog } from '../../database/entities/points-log.entity';
import { Presale } from '../../database/entities/presale.entity';
import { Promotion } from '../../database/entities/promotion.entity';
import { PromotionRule } from '../../database/entities/promotion-rule.entity';
import { TierDiscountRule } from '../../database/entities/tier-discount-rule.entity';
import { UserCoupon } from '../../database/entities/user-coupon.entity';

/**
 * 叠加/互斥/优先级配置（promotion_rules.rule_json）：
 * {
 *   "stackable": ["daily_special","discount","coupon","tier_discount","member_price"],
 *   "mutexGroups": [
 *     { "name": "price", "types": ["daily_special","presale","combo","member_price"] }
 *   ],
 *   "priority": ["combo","presale","daily_special","member_price","tier_discount","discount","coupon"]
 * }
 * - priority 数组越靠前优先级越高；未列出的类型排在最后。
 * - mutexGroups 内的类型只取优先级最高者，其余进入 skipped。
 * - stackable 决定是否可以与其他优惠叠加；未列入的类型仅可单独使用。
 */
interface RuleConfig {
  stackable: PromotionType[];
  mutexGroups: { name: string; types: PromotionType[] }[];
  priority: PromotionType[];
}

const DEFAULT_RULE_CONFIG: RuleConfig = {
  stackable: [
    PromotionType.DAILY_SPECIAL,
    PromotionType.DISCOUNT,
    PromotionType.COUPON,
    PromotionType.TIER_DISCOUNT,
    PromotionType.MEMBER_PRICE,
  ],
  mutexGroups: [
    {
      name: 'price',
      types: [
        PromotionType.DAILY_SPECIAL,
        PromotionType.PRESALE,
        PromotionType.COMBO,
        PromotionType.MEMBER_PRICE,
      ],
    },
  ],
  priority: [
    PromotionType.COMBO,
    PromotionType.PRESALE,
    PromotionType.DAILY_SPECIAL,
    PromotionType.MEMBER_PRICE,
    PromotionType.TIER_DISCOUNT,
    PromotionType.DISCOUNT,
    PromotionType.COUPON,
    PromotionType.POINTS,
  ],
};

export interface SimulateItem {
  skuId: string;
  qty: number;
  unitPrice: number;
}

export interface SimulateParams {
  userId?: string;
  /** 花店维度（顾客单可传） */
  shopId?: string;
  items: SimulateItem[];
  couponCode?: string;
  /** 会员等级；不传则会员价进入 skipped */
  memberLevel?: string;
}

export interface AppliedPromotion {
  type: PromotionType;
  name: string;
  discount: number;
  /** 预售专有：定金/尾款（分），需付尾款标记 */
  deposit?: number;
  balance?: number;
  needBalance?: boolean;
  /** 优惠券专有：试算命中券实例 id，供核销使用 */
  userCouponId?: string;
}

export interface SkippedPromotion {
  type: PromotionType;
  reason: string;
}

export interface SimulateResult {
  originalAmount: number;
  totalDiscount: number;
  finalAmount: number;
  applied: AppliedPromotion[];
  skipped: SkippedPromotion[];
  presale?: { deposit: number; balance: number; needBalance: boolean };
}

interface Candidate extends AppliedPromotion {
  key: string;
  /** 数值越大越优先（同配置优先级时） */
  entityPriority: number;
  groupNames: string[];
}

type AnyRepo = Repository<any>;

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(PromotionRule) private readonly ruleRepo: Repository<PromotionRule>,
    @InjectRepository(DailySpecial) private readonly specialRepo: Repository<DailySpecial>,
    @InjectRepository(Presale) private readonly presaleRepo: Repository<Presale>,
    @InjectRepository(Combo) private readonly comboRepo: Repository<Combo>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon) private readonly userCouponRepo: Repository<UserCoupon>,
    @InjectRepository(DiscountRule) private readonly discountRepo: Repository<DiscountRule>,
    @InjectRepository(MemberPrice) private readonly memberPriceRepo: Repository<MemberPrice>,
    @InjectRepository(PointsAccount) private readonly pointsAccountRepo: Repository<PointsAccount>,
    @InjectRepository(PointsLog) private readonly pointsLogRepo: Repository<PointsLog>,
    @InjectRepository(TierDiscountRule) private readonly tierRepo: Repository<TierDiscountRule>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ==================== 优惠试算 ====================

  /** 优惠试算：读取规则配置，按优先级应用并处理叠加/互斥。 */
  async simulate(scope: RequestScope, params: SimulateParams): Promise<SimulateResult> {
    const items = (params.items ?? []).filter((i) => i && i.qty > 0 && i.unitPrice >= 0);
    const originalAmount = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const applied: AppliedPromotion[] = [];
    const skipped: SkippedPromotion[] = [];
    const candidates = new Map<string, Candidate>();
    const base = this.scopeWhere(scope);
    const now = new Date();

    const rules = await this.ruleRepo.find({
      where: { ...base, status: Status.ENABLED },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
    const config = rules.length ? this.parseRuleConfig(rules[0].ruleJson) : { ...DEFAULT_RULE_CONFIG };

    // 1. 每日特价：命中 SKU 用特价替换单价
    const specials = await this.specialRepo.find({
      where: { ...base, date: this.dateKey(now) },
    });
    const specialMap = new Map(specials.map((s) => [s.skuId, s]));
    for (const item of items) {
      const sp = specialMap.get(item.skuId);
      if (!sp || sp.specialPrice >= item.unitPrice) continue;
      const diff = (item.unitPrice - sp.specialPrice) * item.qty;
      if (diff > 0) {
        this.addCandidate(candidates, {
          key: PromotionType.DAILY_SPECIAL,
          type: PromotionType.DAILY_SPECIAL,
          name: '每日特价',
          discount: diff,
          entityPriority: 0,
          groupNames: [],
        });
      }
    }

    // 2. 满减：取满足门槛中优惠最大的一条
    const discountRules = await this.discountRepo.find({
      where: { ...base, status: Status.ENABLED },
    });
    const eligibleDiscounts = discountRules.filter((r) => originalAmount >= r.threshold && r.discount > 0);
    if (eligibleDiscounts.length) {
      const best = eligibleDiscounts.reduce((a, b) => (b.discount > a.discount ? b : a));
      this.addCandidate(candidates, {
        key: `${PromotionType.DISCOUNT}:${best.id}`,
        type: PromotionType.DISCOUNT,
        name: '满减优惠',
        discount: Math.min(best.discount, originalAmount),
        entityPriority: 0,
        groupNames: [],
      });
    }

    // 3. 起批量优惠：qty >= minQty 触发折扣率或立减
    const skus = [...new Set(items.map((i) => i.skuId))];
    const tierRules = skus.length
      ? await this.tierRepo.find({ where: { ...base, skuId: In(skus) } })
      : [];
    for (const item of items) {
      const matched = tierRules.filter((r) => r.skuId === item.skuId && r.minQty <= item.qty);
      if (!matched.length) continue;
      const lineAmount = item.qty * item.unitPrice;
      const best = matched.reduce((a, b) =>
        this.tierDiscount(b, lineAmount) > this.tierDiscount(a, lineAmount) ? b : a,
      );
      this.addCandidate(candidates, {
        key: PromotionType.TIER_DISCOUNT,
        type: PromotionType.TIER_DISCOUNT,
        name: '起批量优惠',
        discount: this.tierDiscount(best, lineAmount),
        entityPriority: 0,
        groupNames: [],
      });
    }

    // 4. 会员价：按用户等级命中 SKU 专属价
    if (!params.memberLevel) {
      skipped.push({ type: PromotionType.MEMBER_PRICE, reason: '未提供会员等级' });
    } else if (skus.length) {
      const memberPrices = await this.memberPriceRepo.find({
        where: { ...base, level: params.memberLevel, skuId: In(skus) },
      });
      const priceMap = new Map(memberPrices.map((m) => [m.skuId, m.price]));
      for (const item of items) {
        const price = priceMap.get(item.skuId);
        if (price === undefined || price >= item.unitPrice) continue;
        this.addCandidate(candidates, {
          key: PromotionType.MEMBER_PRICE,
          type: PromotionType.MEMBER_PRICE,
          name: '会员价',
          discount: (item.unitPrice - price) * item.qty,
          entityPriority: 0,
          groupNames: [],
        });
      }
    }

    // 5. 套餐：items 覆盖套餐明细则整体价替换
    const combos = await this.comboRepo.find({ where: { ...base, status: Status.ENABLED } });
    for (const combo of combos) {
      const req = this.parseComboItems(combo.itemsJson);
      if (!req.length) continue;
      const hit = req.every((r) => items.some((i) => i.skuId === r.skuId && i.qty >= r.qty));
      if (!hit) continue;
      const comboOriginal = req.reduce((sum, r) => {
        const unit = items.find((i) => i.skuId === r.skuId)?.unitPrice ?? 0;
        return sum + unit * r.qty;
      }, 0);
      const diff = comboOriginal - combo.comboPrice;
      if (diff > 0) {
        this.addCandidate(candidates, {
          key: `${PromotionType.COMBO}:${combo.id}`,
          type: PromotionType.COMBO,
          name: combo.name,
          discount: diff,
          entityPriority: 0,
          groupNames: [],
        });
      }
    }

    // 6. 预售：不改单价，标记定金/尾款
    const presales = await this.presaleRepo.find({ where: { ...base, status: Status.ENABLED } });
    for (const item of items) {
      const ps = presales.find(
        (p) => p.skuId === item.skuId && now >= p.startAt && now <= p.endAt,
      );
      if (!ps) continue;
      this.addCandidate(candidates, {
        key: PromotionType.PRESALE,
        type: PromotionType.PRESALE,
        name: '预售定金',
        discount: 0,
        deposit: ps.deposit * item.qty,
        balance: ps.balance * item.qty,
        needBalance: true,
        entityPriority: 0,
        groupNames: [],
      });
    }

    // 7. 优惠券：核验券码、有效期、持有且未使用、门槛
    if (params.couponCode) {
      const coupon = await this.couponRepo.findOne({
        where: { ...base, code: params.couponCode, status: Status.ENABLED },
      });
      if (!coupon) {
        skipped.push({ type: PromotionType.COUPON, reason: '券码无效或已停用' });
      } else if ((coupon.validFrom && now < coupon.validFrom) || (coupon.validTo && now > coupon.validTo)) {
        skipped.push({ type: PromotionType.COUPON, reason: '优惠券不在有效期内' });
      } else if (!params.userId) {
        skipped.push({ type: PromotionType.COUPON, reason: '未提供用户，无法核验券实例' });
      } else if (originalAmount < coupon.threshold) {
        skipped.push({ type: PromotionType.COUPON, reason: '订单金额未达使用门槛' });
      } else {
        const userCoupon = await this.userCouponRepo.findOne({
          where: {
            tenantId: scope.tenantId,
            supplierId: scope.supplierId ?? undefined,
            userId: params.userId,
            couponId: coupon.id,
            used: false,
          },
        });
        if (!userCoupon) {
          skipped.push({ type: PromotionType.COUPON, reason: '未持有未使用的优惠券' });
        } else {
          const discount =
            coupon.type === 'percent'
              ? Math.round((originalAmount * (100 - coupon.amount)) / 100)
              : coupon.amount;
          if (discount > 0) {
            this.addCandidate(candidates, {
              key: `${PromotionType.COUPON}:${userCoupon.id}`,
              type: PromotionType.COUPON,
              name: coupon.name,
              discount: Math.min(discount, originalAmount),
              userCouponId: userCoupon.id,
              entityPriority: 0,
              groupNames: [],
            });
          }
        }
      }
    }

    // 按配置优先级排序，再按优惠额降序
    const priorityIndex = (t: PromotionType): number => {
      const idx = config.priority.indexOf(t);
      return idx < 0 ? config.priority.length : idx;
    };
    const sorted = [...candidates.values()].sort(
      (a, b) => priorityIndex(a.type) - priorityIndex(b.type) || b.discount - a.discount,
    );

    const appliedGroups = new Set<string>();
    let appliedCount = 0;
    for (const candidate of sorted) {
      const groups = candidate.groupNames.length
        ? candidate.groupNames
        : config.mutexGroups.filter((g) => g.types.includes(candidate.type)).map((g) => g.name);
      const conflict = groups.find((g) => appliedGroups.has(g));
      if (conflict) {
        skipped.push({
          type: candidate.type,
          reason: `互斥组 ${conflict} 已应用更高优先级优惠`,
        });
        continue;
      }
      if (appliedCount > 0 && !config.stackable.includes(candidate.type)) {
        skipped.push({ type: candidate.type, reason: '该优惠不可与其他优惠叠加' });
        continue;
      }
      applied.push({
        type: candidate.type,
        name: candidate.name,
        discount: candidate.discount,
        ...(candidate.deposit !== undefined ? { deposit: candidate.deposit } : {}),
        ...(candidate.balance !== undefined ? { balance: candidate.balance } : {}),
        ...(candidate.needBalance !== undefined ? { needBalance: candidate.needBalance } : {}),
        ...(candidate.userCouponId ? { userCouponId: candidate.userCouponId } : {}),
      });
      groups.forEach((g) => appliedGroups.add(g));
      appliedCount += 1;
    }

    const totalDiscount = Math.min(applied.reduce((sum, a) => sum + a.discount, 0), originalAmount);
    const result: SimulateResult = {
      originalAmount,
      totalDiscount,
      finalAmount: originalAmount - totalDiscount,
      applied,
      skipped,
    };
    const presale = applied.find((a) => a.type === PromotionType.PRESALE);
    if (presale) {
      result.presale = {
        deposit: presale.deposit ?? 0,
        balance: presale.balance ?? 0,
        needBalance: presale.needBalance ?? true,
      };
    }
    return result;
  }

  // ==================== 优惠券 ====================

  /** 发券：核验券模板有效且未重复领取。 */
  async issueCoupon(scope: RequestScope, couponId: string, userId: string) {
    const coupon = await this.couponRepo.findOne({
      where: { ...this.scopeWhere(scope), id: couponId, status: Status.ENABLED },
    });
    if (!coupon) throw new NotFoundException('优惠券不存在或已停用');
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) throw new BadRequestException('优惠券尚未生效');
    if (coupon.validTo && now > coupon.validTo) throw new BadRequestException('优惠券已过期');

    const existing = await this.userCouponRepo.findOne({
      where: {
        tenantId: scope.tenantId,
        supplierId: scope.supplierId ?? undefined,
        userId,
        couponId,
        used: false,
      },
    });
    if (existing) throw new BadRequestException('该账号已领取此优惠券');

    const issued = await this.userCouponRepo.save(
      this.userCouponRepo.create({
        tenantId: scope.tenantId,
        supplierId: scope.supplierId ?? coupon.supplierId,
        userId,
        couponId,
        used: false,
        obtainedAt: now,
      }),
    );
    return { id: issued.id, couponId, userId, obtainedAt: issued.obtainedAt };
  }

  /** 用券核销：由订单模块在支付确认后调用，仅标记券实例已使用。 */
  async useCoupon(scope: RequestScope, orderId: string, userCouponId: string, userId?: string) {
    const where: Record<string, unknown> = {
      ...this.scopeWhere(scope),
      id: userCouponId,
    };
    if (userId) where.userId = userId;
    const userCoupon = await this.userCouponRepo.findOne({ where });
    if (!userCoupon) throw new NotFoundException('券实例不存在或无权核销');
    if (userCoupon.used) throw new BadRequestException('优惠券已使用');
    if (userId && userCoupon.userId !== userId) throw new ForbiddenException('无权核销该优惠券');

    await this.userCouponRepo.update(
      { id: userCoupon.id, used: false },
      { used: true, usedOrderId: orderId },
    );
    return { userCouponId: userCoupon.id, orderId, used: true };
  }

  // ==================== 积分 ====================

  /** 我的积分：无账户时返回 0。 */
  async myPoints(scope: RequestScope, userId: string) {
    const account = await this.pointsAccountRepo.findOne({
      where: {
        tenantId: scope.tenantId,
        shopId: scope.shopId ?? '0',
        userId,
      },
    });
    return {
      userId,
      shopId: scope.shopId ?? '0',
      balance: account?.balance ?? 0,
    };
  }

  /** 积分增减：事务内写流水并更新余额，不允许扣成负数。 */
  async adjustPoints(
    scope: RequestScope,
    userId: string,
    change: number,
    ref: { refType?: string; refNo?: string; remark?: string } = {},
  ) {
    if (!Number.isInteger(change) || change === 0) {
      throw new BadRequestException('积分变动值必须为非零整数');
    }
    const shopId = scope.shopId ?? '0';
    return this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(PointsAccount);
      const logRepo = manager.getRepository(PointsLog);
      let account = await accountRepo.findOne({
        where: { tenantId: scope.tenantId, shopId, userId },
      });
      if (!account) {
        account = accountRepo.create({
          tenantId: scope.tenantId,
          shopId,
          userId,
          balance: 0,
        });
      }
      const balance = account.balance + change;
      if (balance < 0) throw new BadRequestException('积分不足，无法扣减');
      account.balance = balance;
      await accountRepo.save(account);
      const log = await logRepo.save(
        logRepo.create({
          tenantId: scope.tenantId,
          shopId,
          userId,
          change,
          refType: ref.refType ?? null,
          refNo: ref.refNo ?? null,
          remark: ref.remark ?? null,
        }),
      );
      return { userId, shopId, change, balance, logId: log.id };
    });
  }

  // ==================== 缺货替换价差 ====================

  /**
   * 缺货替换价差：仅产出待处理标记，供 M3 售后落单；不自动处理库存或资金。
   * direction 支持 AfterSaleType.PRICE_DIFF_PAY / PRICE_DIFF_REFUND（或 'pay' / 'refund'）。
   */
  handlePriceDiff(
    scope: RequestScope,
    orderId: string,
    priceDiff: number,
    direction: AfterSaleType | 'pay' | 'refund',
  ) {
    const isRefund =
      direction === AfterSaleType.PRICE_DIFF_REFUND || direction === 'refund';
    const resolved = isRefund ? AfterSaleType.PRICE_DIFF_REFUND : AfterSaleType.PRICE_DIFF_PAY;
    return {
      tenantId: scope.tenantId,
      orderId,
      priceDiff: Math.abs(priceDiff),
      direction: resolved,
      action: isRefund ? '需退回' : '需补付',
      status: 'pending',
      note: '由批发商售后确认后执行，不自动处理库存',
    };
  }

  // ==================== 通用 CRUD（管理端） ====================

  listPromotions(scope: RequestScope) {
    return this.listInScope(this.promotionRepo, scope);
  }
  findPromotion(scope: RequestScope, id: string) {
    return this.promotionRepo.findOne({ where: { ...this.scopeWhere(scope), id } });
  }
  createPromotion(scope: RequestScope, dto: object) {
    return this.createInScope(this.promotionRepo, scope, dto);
  }
  updatePromotion(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.promotionRepo, scope, id, dto);
  }
  removePromotion(scope: RequestScope, id: string) {
    return this.removeInScope(this.promotionRepo, scope, id);
  }

  listPromotionRules(scope: RequestScope) {
    return this.listInScope(this.ruleRepo, scope);
  }
  savePromotionRule(scope: RequestScope, dto: { ruleJson: string; priority?: number }) {
    this.parseRuleConfig(dto.ruleJson);
    return this.createInScope(this.ruleRepo, scope, dto);
  }

  createDailySpecial(scope: RequestScope, dto: object) {
    return this.createInScope(this.specialRepo, scope, dto);
  }
  listDailySpecials(scope: RequestScope, date?: string) {
    return this.listInScope(this.specialRepo, scope, date ? { date } : {});
  }
  updateDailySpecial(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.specialRepo, scope, id, dto);
  }
  removeDailySpecial(scope: RequestScope, id: string) {
    return this.removeInScope(this.specialRepo, scope, id);
  }

  createPresale(scope: RequestScope, dto: object) {
    return this.createInScope(this.presaleRepo, scope, dto);
  }
  listPresales(scope: RequestScope) {
    return this.listInScope(this.presaleRepo, scope);
  }
  updatePresale(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.presaleRepo, scope, id, dto);
  }
  removePresale(scope: RequestScope, id: string) {
    return this.removeInScope(this.presaleRepo, scope, id);
  }

  createCombo(scope: RequestScope, dto: object) {
    return this.createInScope(this.comboRepo, scope, dto);
  }
  listCombos(scope: RequestScope) {
    return this.listInScope(this.comboRepo, scope);
  }
  updateCombo(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.comboRepo, scope, id, dto);
  }
  removeCombo(scope: RequestScope, id: string) {
    return this.removeInScope(this.comboRepo, scope, id);
  }

  createCoupon(scope: RequestScope, dto: object) {
    return this.createInScope(this.couponRepo, scope, dto);
  }
  listCoupons(scope: RequestScope) {
    return this.listInScope(this.couponRepo, scope);
  }
  updateCoupon(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.couponRepo, scope, id, dto);
  }
  removeCoupon(scope: RequestScope, id: string) {
    return this.removeInScope(this.couponRepo, scope, id);
  }

  createDiscountRule(scope: RequestScope, dto: object) {
    return this.createInScope(this.discountRepo, scope, dto);
  }
  listDiscountRules(scope: RequestScope) {
    return this.listInScope(this.discountRepo, scope);
  }
  updateDiscountRule(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.discountRepo, scope, id, dto);
  }
  removeDiscountRule(scope: RequestScope, id: string) {
    return this.removeInScope(this.discountRepo, scope, id);
  }

  createMemberPrice(scope: RequestScope, dto: object) {
    return this.createInScope(this.memberPriceRepo, scope, dto);
  }
  listMemberPrices(scope: RequestScope) {
    return this.listInScope(this.memberPriceRepo, scope);
  }
  updateMemberPrice(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.memberPriceRepo, scope, id, dto);
  }
  removeMemberPrice(scope: RequestScope, id: string) {
    return this.removeInScope(this.memberPriceRepo, scope, id);
  }

  createTierRule(scope: RequestScope, dto: object) {
    return this.createInScope(this.tierRepo, scope, dto);
  }
  listTierRules(scope: RequestScope) {
    return this.listInScope(this.tierRepo, scope);
  }
  updateTierRule(scope: RequestScope, id: string, dto: object) {
    return this.updateInScope(this.tierRepo, scope, id, dto);
  }
  removeTierRule(scope: RequestScope, id: string) {
    return this.removeInScope(this.tierRepo, scope, id);
  }

  // ==================== 内部辅助 ====================

  /** 所有查询强制带 scope，批发商不存在时不加 supplier 条件（平台维度） */
  private scopeWhere(scope: RequestScope): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    return where;
  }

  private listInScope(repo: AnyRepo, scope: RequestScope, extra: Record<string, unknown> = {}) {
    return repo.find({
      where: { ...this.scopeWhere(scope), ...extra },
      order: { createdAt: 'DESC' },
    });
  }

  private async createInScope(repo: AnyRepo, scope: RequestScope, dto: object) {
    return repo.save(repo.create({ ...this.scopeWhere(scope), ...dto }));
  }

  private async updateInScope(repo: AnyRepo, scope: RequestScope, id: string, dto: object) {
    const entity = await repo.findOne({ where: { ...this.scopeWhere(scope), id } });
    if (!entity) throw new NotFoundException('记录不存在或无权访问');
    Object.assign(entity, dto);
    return repo.save(entity);
  }

  private async removeInScope(repo: AnyRepo, scope: RequestScope, id: string) {
    const entity = await repo.findOne({ where: { ...this.scopeWhere(scope), id } });
    if (!entity) throw new NotFoundException('记录不存在或无权访问');
    await repo.remove(entity);
    return { id, removed: true };
  }

  private addCandidate(map: Map<string, Candidate>, candidate: Candidate): void {
    const existing = map.get(candidate.key);
    if (!existing) {
      map.set(candidate.key, candidate);
      return;
    }
    existing.discount += candidate.discount;
    if (candidate.deposit !== undefined) {
      existing.deposit = (existing.deposit ?? 0) + candidate.deposit;
    }
    if (candidate.balance !== undefined) {
      existing.balance = (existing.balance ?? 0) + candidate.balance;
    }
  }

  private tierDiscount(rule: TierDiscountRule, lineAmount: number): number {
    if (rule.discount > 0 && rule.discount < 1) {
      return Math.round(lineAmount * (1 - rule.discount));
    }
    return Math.min(rule.discount, lineAmount);
  }

  private parseComboItems(json: string): { skuId: string; qty: number }[] {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((i): i is { skuId: string; qty: number } =>
          !!i && typeof i.skuId === 'string' && typeof i.qty === 'number' && i.qty > 0,
        )
        .map((i) => ({ skuId: i.skuId, qty: i.qty }));
    } catch {
      return [];
    }
  }

  private parseRuleConfig(json: string): RuleConfig {
    try {
      const raw = JSON.parse(json) as Partial<RuleConfig>;
      return {
        stackable: Array.isArray(raw.stackable) ? raw.stackable : [...DEFAULT_RULE_CONFIG.stackable],
        mutexGroups: Array.isArray(raw.mutexGroups)
          ? raw.mutexGroups
              .filter((g) => !!g && Array.isArray(g.types))
              .map((g) => ({ name: g.name || 'group', types: g.types }))
          : DEFAULT_RULE_CONFIG.mutexGroups.map((g) => ({ ...g })),
        priority: Array.isArray(raw.priority) ? raw.priority : [...DEFAULT_RULE_CONFIG.priority],
      };
    } catch {
      return { ...DEFAULT_RULE_CONFIG };
    }
  }

  private dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
