import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { MarketingService } from './marketing.service';
import {
  CreatePromotionDto,
  CreatePromotionRuleDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import {
  CreateComboDto,
  CreateCouponDto,
  CreateDailySpecialDto,
  CreateDiscountRuleDto,
  CreateMemberPriceDto,
  CreatePresaleDto,
  CreateTierRuleDto,
  UpdateComboDto,
  UpdateCouponDto,
  UpdateDailySpecialDto,
  UpdateDiscountRuleDto,
  UpdateMemberPriceDto,
  UpdatePresaleDto,
  UpdateTierRuleDto,
} from './dto/activity.dto';
import {
  AdjustPointsDto,
  IssueCouponDto,
  SimulateDto,
  UseCouponDto,
} from './dto/marketing.dto';

/** 活动主表 + 各子活动维护。静态子路由必须声明在 @Get(':id') 之前。 */
@Controller('admin/promotions')
export class PromotionController {
  constructor(private readonly service: MarketingService) {}

  @Get()
  @RequiresPerm(PermCode.PRICE_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.service.listPromotions(scope);
  }

  @Post()
  @RequiresPerm(PermCode.PRICE_WRITE)
  create(@Body() dto: CreatePromotionDto, @CurrentScope() scope: RequestScope) {
    return this.service.createPromotion(scope, dto);
  }

  // ---------- 每日特价 ----------
  @Get('daily')
  @RequiresPerm(PermCode.PRICE_READ)
  dailyList(@CurrentScope() scope: RequestScope, @Query('date') date?: string) {
    return this.service.listDailySpecials(scope, date);
  }

  @Post('daily')
  @RequiresPerm(PermCode.PRICE_WRITE)
  dailyCreate(@Body() dto: CreateDailySpecialDto, @CurrentScope() scope: RequestScope) {
    return this.service.createDailySpecial(scope, dto);
  }

  @Put('daily/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  dailyUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateDailySpecialDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updateDailySpecial(scope, id, dto);
  }

  @Delete('daily/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  dailyRemove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removeDailySpecial(scope, id);
  }

  // ---------- 预售 ----------
  @Get('presale')
  @RequiresPerm(PermCode.PRICE_READ)
  presaleList(@CurrentScope() scope: RequestScope) {
    return this.service.listPresales(scope);
  }

  @Post('presale')
  @RequiresPerm(PermCode.PRICE_WRITE)
  presaleCreate(@Body() dto: CreatePresaleDto, @CurrentScope() scope: RequestScope) {
    return this.service.createPresale(scope, dto);
  }

  @Put('presale/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  presaleUpdate(
    @Param('id') id: string,
    @Body() dto: UpdatePresaleDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updatePresale(scope, id, dto);
  }

  @Delete('presale/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  presaleRemove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removePresale(scope, id);
  }

  // ---------- 套餐 ----------
  @Get('combo')
  @RequiresPerm(PermCode.PRICE_READ)
  comboList(@CurrentScope() scope: RequestScope) {
    return this.service.listCombos(scope);
  }

  @Post('combo')
  @RequiresPerm(PermCode.PRICE_WRITE)
  comboCreate(@Body() dto: CreateComboDto, @CurrentScope() scope: RequestScope) {
    return this.service.createCombo(scope, dto);
  }

  @Put('combo/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  comboUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateComboDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updateCombo(scope, id, dto);
  }

  @Delete('combo/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  comboRemove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removeCombo(scope, id);
  }

  // ---------- 会员价 ----------
  @Get('member-price')
  @RequiresPerm(PermCode.PRICE_READ)
  memberPriceList(@CurrentScope() scope: RequestScope) {
    return this.service.listMemberPrices(scope);
  }

  @Post('member-price')
  @RequiresPerm(PermCode.PRICE_WRITE)
  memberPriceCreate(@Body() dto: CreateMemberPriceDto, @CurrentScope() scope: RequestScope) {
    return this.service.createMemberPrice(scope, dto);
  }

  @Put('member-price/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  memberPriceUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateMemberPriceDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updateMemberPrice(scope, id, dto);
  }

  @Delete('member-price/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  memberPriceRemove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removeMemberPrice(scope, id);
  }

  // ---------- 起批量 ----------
  @Get('tier')
  @RequiresPerm(PermCode.PRICE_READ)
  tierList(@CurrentScope() scope: RequestScope) {
    return this.service.listTierRules(scope);
  }

  @Post('tier')
  @RequiresPerm(PermCode.PRICE_WRITE)
  tierCreate(@Body() dto: CreateTierRuleDto, @CurrentScope() scope: RequestScope) {
    return this.service.createTierRule(scope, dto);
  }

  @Put('tier/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  tierUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateTierRuleDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updateTierRule(scope, id, dto);
  }

  @Delete('tier/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  tierRemove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removeTierRule(scope, id);
  }

  // ---------- 满减 ----------
  @Get('discount')
  @RequiresPerm(PermCode.PRICE_READ)
  discountList(@CurrentScope() scope: RequestScope) {
    return this.service.listDiscountRules(scope);
  }

  @Post('discount')
  @RequiresPerm(PermCode.PRICE_WRITE)
  discountCreate(@Body() dto: CreateDiscountRuleDto, @CurrentScope() scope: RequestScope) {
    return this.service.createDiscountRule(scope, dto);
  }

  @Put('discount/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  discountUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateDiscountRuleDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updateDiscountRule(scope, id, dto);
  }

  @Delete('discount/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  discountRemove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removeDiscountRule(scope, id);
  }

  // ---------- 活动主表 ----------
  @Get(':id')
  @RequiresPerm(PermCode.PRICE_READ)
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.findPromotion(scope, id);
  }

  @Put(':id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updatePromotion(scope, id, dto);
  }

  @Delete(':id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  remove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removePromotion(scope, id);
  }
}

@Controller('admin/promotion-rules')
export class PromotionRuleController {
  constructor(private readonly service: MarketingService) {}

  @Get()
  @RequiresPerm(PermCode.PRICE_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.service.listPromotionRules(scope);
  }

  /** 保存叠加/互斥/优先级配置 */
  @Post()
  @RequiresPerm(PermCode.PRICE_WRITE)
  save(@Body() dto: CreatePromotionRuleDto, @CurrentScope() scope: RequestScope) {
    return this.service.savePromotionRule(scope, dto);
  }
}

@Controller('admin/coupons')
export class CouponController {
  constructor(private readonly service: MarketingService) {}

  @Get()
  @RequiresPerm(PermCode.PRICE_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.service.listCoupons(scope);
  }

  @Post()
  @RequiresPerm(PermCode.PRICE_WRITE)
  create(@Body() dto: CreateCouponDto, @CurrentScope() scope: RequestScope) {
    return this.service.createCoupon(scope, dto);
  }

  /** 发券 */
  @Post('issue')
  @RequiresPerm(PermCode.PRICE_WRITE)
  issue(@Body() dto: IssueCouponDto, @CurrentScope() scope: RequestScope) {
    return this.service.issueCoupon(scope, dto.couponId, dto.userId);
  }

  @Put(':id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.updateCoupon(scope, id, dto);
  }

  @Delete(':id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  remove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.service.removeCoupon(scope, id);
  }
}

@Controller('points')
export class PointsController {
  constructor(private readonly service: MarketingService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload, @CurrentScope() scope: RequestScope) {
    return this.service.myPoints(scope, user.sub);
  }
}

@Controller('admin/points')
export class AdminPointsController {
  constructor(private readonly service: MarketingService) {}

  @Post('adjust')
  @RequiresPerm(PermCode.FINANCE_WRITE)
  adjust(@Body() dto: AdjustPointsDto, @CurrentScope() scope: RequestScope) {
    return this.service.adjustPoints(scope, dto.userId, dto.change, {
      refType: dto.refType,
      refNo: dto.refNo,
      remark: dto.remark,
    });
  }
}

@Controller('admin/marketing')
export class MarketingSimulateController {
  constructor(private readonly service: MarketingService) {}

  @Post('simulate')
  @RequiresPerm(PermCode.PRICE_READ)
  simulate(@Body() dto: SimulateDto, @CurrentScope() scope: RequestScope) {
    return this.service.simulate(scope, dto);
  }
}

@Controller('orders')
export class OrderCouponController {
  constructor(private readonly service: MarketingService) {}

  /** 用券核销（订单支付确认后调用） */
  @Post(':id/coupon')
  @RequiresPerm(PermCode.ORDER_WRITE)
  useCoupon(
    @Param('id') id: string,
    @Body() dto: UseCouponDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.useCoupon(scope, id, dto.userCouponId, dto.userId);
  }
}
