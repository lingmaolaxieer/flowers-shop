import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { PriceService } from './price.service';
import { QuoteDto } from './dto/quote.dto';
import { CreateDailyQuoteDto } from './dto/create-daily-quote.dto';
import { UpdateDailyQuoteDto } from './dto/update-daily-quote.dto';
import { QueryDailyDto } from './dto/query-daily.dto';
import { CreateShopSpecificDto } from './dto/create-shop-specific.dto';
import { CreateTierDto } from './dto/create-tier.dto';
import { CreateLevelDto } from './dto/create-level.dto';

/** 店家端：今日报价与取价（批发价，仅店家/批发商可见）。 */
@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('today')
  @RequiresPerm(PermCode.PRICE_READ)
  today(@CurrentScope() scope: RequestScope, @Query('shopId') shopId?: string) {
    return this.priceService.today(scope, shopId);
  }

  @Post('quote')
  @RequiresPerm(PermCode.PRICE_READ)
  quote(@CurrentScope() scope: RequestScope, @Body() dto: QuoteDto) {
    return this.priceService.quote(scope, dto);
  }
}

/** 管理端：价格体系维护。 */
@Controller('admin/prices')
export class AdminPriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('daily')
  @RequiresPerm(PermCode.PRICE_READ)
  listDaily(@CurrentScope() scope: RequestScope, @Query() query: QueryDailyDto) {
    return this.priceService.listDaily(scope, query.effectiveDate);
  }

  @Post('daily')
  @RequiresPerm(PermCode.PRICE_WRITE)
  createDaily(@CurrentScope() scope: RequestScope, @Body() dto: CreateDailyQuoteDto) {
    return this.priceService.createDaily(scope, dto);
  }

  @Put('daily/:id')
  @RequiresPerm(PermCode.PRICE_WRITE)
  updateDaily(
    @Param('id') id: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateDailyQuoteDto,
  ) {
    return this.priceService.updateDaily(id, scope, dto);
  }

  @Get('shop-specific')
  @RequiresPerm(PermCode.PRICE_READ)
  listShopSpecific(@CurrentScope() scope: RequestScope) {
    return this.priceService.listShopSpecific(scope);
  }

  @Post('shop-specific')
  @RequiresPerm(PermCode.PRICE_WRITE)
  createShopSpecific(@CurrentScope() scope: RequestScope, @Body() dto: CreateShopSpecificDto) {
    return this.priceService.createShopSpecific(scope, dto);
  }

  @Get('tier')
  @RequiresPerm(PermCode.PRICE_READ)
  listTier(@CurrentScope() scope: RequestScope) {
    return this.priceService.listTier(scope);
  }

  @Post('tier')
  @RequiresPerm(PermCode.PRICE_WRITE)
  createTier(@CurrentScope() scope: RequestScope, @Body() dto: CreateTierDto) {
    return this.priceService.createTier(scope, dto);
  }

  @Get('level')
  @RequiresPerm(PermCode.PRICE_READ)
  listLevel(@CurrentScope() scope: RequestScope) {
    return this.priceService.listLevel(scope);
  }

  @Post('level')
  @RequiresPerm(PermCode.PRICE_WRITE)
  createLevel(@CurrentScope() scope: RequestScope, @Body() dto: CreateLevelDto) {
    return this.priceService.createLevel(scope, dto);
  }
}
