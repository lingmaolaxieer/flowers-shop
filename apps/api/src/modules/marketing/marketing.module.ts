import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import {
  AdminPointsController,
  CouponController,
  MarketingSimulateController,
  OrderCouponController,
  PointsController,
  PromotionController,
  PromotionRuleController,
} from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      PromotionRule,
      DailySpecial,
      Presale,
      Combo,
      Coupon,
      UserCoupon,
      DiscountRule,
      MemberPrice,
      PointsAccount,
      PointsLog,
      TierDiscountRule,
    ]),
  ],
  controllers: [
    PromotionController,
    PromotionRuleController,
    CouponController,
    PointsController,
    AdminPointsController,
    MarketingSimulateController,
    OrderCouponController,
  ],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
