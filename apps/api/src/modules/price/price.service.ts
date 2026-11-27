import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  PriceDailyQuote,
  ShopLevelPrice,
  ShopSpecificPrice,
  TierPrice,
} from '../../database/entities';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { QuoteDto } from './dto/quote.dto';
import { CreateDailyQuoteDto } from './dto/create-daily-quote.dto';
import { UpdateDailyQuoteDto } from './dto/update-daily-quote.dto';
import { CreateShopSpecificDto } from './dto/create-shop-specific.dto';
import { CreateTierDto } from './dto/create-tier.dto';
import { CreateLevelDto } from './dto/create-level.dto';

/** 命中的价格来源，便于店家核对。 */
export type PriceSource = 'SHOP_SPECIFIC' | 'SHOP_LEVEL' | 'TIER' | 'DAILY';

export interface QuoteResult {
  skuId: string;
  shopId: string;
  qty: number;
  /** 适用批发价，单位：分（店家可见，顾客端永远不可见） */
  price: number;
  source: PriceSource;
}

@Injectable()
export class PriceService {
  constructor(
    @InjectRepository(PriceDailyQuote) private readonly dailyRepo: Repository<PriceDailyQuote>,
    @InjectRepository(ShopSpecificPrice) private readonly specificRepo: Repository<ShopSpecificPrice>,
    @InjectRepository(ShopLevelPrice) private readonly levelRepo: Repository<ShopLevelPrice>,
    @InjectRepository(TierPrice) private readonly tierRepo: Repository<TierPrice>,
  ) {}

  // ==================== 店家端：今日报价 / 取价 ====================

  /** 店家今日报价：当天每日报价列表；传 shopId 时按优先级给出店家实际适用价。 */
  async today(scope: RequestScope, shopId?: string) {
    const where = this.scoped(scope, { effectiveDate: this.todayStr() });
    const quotes = await this.dailyRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    // 同一 SKU 可能多时段，只保留最新一条作为展示基准
    const latestBySku = new Map<string, PriceDailyQuote>();
    for (const q of quotes) if (!latestBySku.has(q.skuId)) latestBySku.set(q.skuId, q);

    const items: Array<{
      skuId: string;
      price: number;
      source: PriceSource;
      dailyPrice: number;
      timeSlot: string | null;
      effectiveDate: string;
    }> = [];
    for (const q of latestBySku.values()) {
      let price = q.price;
      let source: PriceSource = 'DAILY';
      if (shopId) {
        const quoted = await this.resolvePrice(scope, q.skuId, shopId, 1, undefined);
        if (quoted) {
          price = quoted.price;
          source = quoted.source;
        }
      }
      items.push({
        skuId: q.skuId,
        price,
        source,
        dailyPrice: q.price,
        timeSlot: q.timeSlot ?? null,
        effectiveDate: q.effectiveDate,
      });
    }
    return items;
  }

  /**
   * 统一取价。优先级：一店一价 > 店家等级价 > 阶梯价 > 每日报价。
   * 未命中任何规则时抛 404，绝不返回顾客零售价兜底。
   */
  async quote(scope: RequestScope, dto: QuoteDto): Promise<QuoteResult> {
    const hit = await this.resolvePrice(scope, dto.skuId, dto.shopId, dto.qty, dto.level);
    if (!hit) throw new NotFoundException('该 SKU 未配置任何适用报价');
    return {
      skuId: dto.skuId,
      shopId: dto.shopId,
      qty: dto.qty,
      price: hit.price,
      source: hit.source,
    };
  }

  // ==================== 管理端：每日报价 ====================

  async listDaily(scope: RequestScope, effectiveDate?: string) {
    return this.dailyRepo.find({
      where: this.scoped(scope, effectiveDate ? { effectiveDate } : {}),
      order: { effectiveDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async createDaily(scope: RequestScope, dto: CreateDailyQuoteDto) {
    const supplierId = this.requireSupplier(scope);
    return this.dailyRepo.save(
      this.dailyRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        skuId: dto.skuId,
        price: dto.price,
        timeSlot: dto.timeSlot,
        effectiveDate: dto.effectiveDate,
      }),
    );
  }

  async updateDaily(id: string, scope: RequestScope, dto: UpdateDailyQuoteDto) {
    const quote = await this.dailyRepo.findOne({ where: this.scoped(scope, { id }) });
    if (!quote) throw new NotFoundException('每日报价不存在');
    const fields: Partial<PriceDailyQuote> = {};
    if (dto.price !== undefined) fields.price = dto.price;
    if (dto.effectiveDate !== undefined) fields.effectiveDate = dto.effectiveDate;
    if (dto.timeSlot !== undefined) fields.timeSlot = dto.timeSlot;
    await this.dailyRepo.update({ id }, fields);
    return { id, updated: true };
  }

  // ==================== 管理端：一店一价 / 阶梯价 / 等级价 ====================

  async createShopSpecific(scope: RequestScope, dto: CreateShopSpecificDto) {
    const supplierId = this.requireSupplier(scope);
    return this.specificRepo.save(
      this.specificRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        shopId: dto.shopId,
        skuId: dto.skuId,
        price: dto.price,
      }),
    );
  }

  async listShopSpecific(scope: RequestScope) {
    return this.specificRepo.find({ where: this.scoped(scope, {}), order: { createdAt: 'DESC' } });
  }

  async createTier(scope: RequestScope, dto: CreateTierDto) {
    const supplierId = this.requireSupplier(scope);
    return this.tierRepo.save(
      this.tierRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        skuId: dto.skuId,
        minQty: dto.minQty,
        price: dto.price,
      }),
    );
  }

  async listTier(scope: RequestScope) {
    return this.tierRepo.find({
      where: this.scoped(scope, {}),
      order: { skuId: 'ASC', minQty: 'ASC' },
    });
  }

  async createLevel(scope: RequestScope, dto: CreateLevelDto) {
    const supplierId = this.requireSupplier(scope);
    return this.levelRepo.save(
      this.levelRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        skuId: dto.skuId,
        level: dto.level,
        price: dto.price,
      }),
    );
  }

  async listLevel(scope: RequestScope) {
    return this.levelRepo.find({ where: this.scoped(scope, {}), order: { createdAt: 'DESC' } });
  }

  // ==================== 内部辅助 ====================

  /** 按优先级解析价格；全部未命中返回 null。 */
  private async resolvePrice(
    scope: RequestScope,
    skuId: string,
    shopId: string,
    qty: number,
    level?: string,
  ): Promise<{ price: number; source: PriceSource } | null> {
    const base = this.scoped(scope, { skuId });

    // 1. 一店一价（最高优先级）
    const specific = await this.specificRepo.findOne({
      where: { ...base, shopId },
      order: { createdAt: 'DESC' },
    });
    if (specific) return { price: specific.price, source: 'SHOP_SPECIFIC' };

    // 2. 店家等级价（需调用方提供等级标识）
    if (level) {
      const levelPrice = await this.levelRepo.findOne({
        where: { ...base, level },
        order: { createdAt: 'DESC' },
      });
      if (levelPrice) return { price: levelPrice.price, source: 'SHOP_LEVEL' };
    }

    // 3. 阶梯价：取 MinQty 不超过 qty 的最大档
    const tiers = await this.tierRepo.find({ where: base, order: { minQty: 'DESC' } });
    const tier = tiers.find((t) => qty >= t.minQty);
    if (tier) return { price: tier.price, source: 'TIER' };

    // 4. 每日报价（当天最新一条）
    const daily = await this.dailyRepo.findOne({
      where: { ...base, effectiveDate: this.todayStr() },
      order: { createdAt: 'DESC' },
    });
    if (daily) return { price: daily.price, source: 'DAILY' };

    return null;
  }

  private scoped(scope: RequestScope, extra: Record<string, unknown>): FindOptionsWhere<any> {
    const where: Record<string, unknown> = { tenantId: scope.tenantId, ...extra };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    return where as FindOptionsWhere<any>;
  }

  private requireSupplier(scope: RequestScope): string {
    if (!scope.supplierId) throw new BadRequestException('当前身份未关联批发商，无法维护价格');
    return scope.supplierId;
  }

  private todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
