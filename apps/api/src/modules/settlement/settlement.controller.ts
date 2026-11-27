import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { SettlementService } from './settlement.service';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
} from './dto/commission-rule.dto';
import { UpdateSettlementConfigDto } from './dto/settlement-config.dto';
import { ProfitShareDto } from './dto/profit-share.dto';
import { CommissionDetailQueryDto } from './dto/commission-detail-query.dto';

@Controller('admin/commission-rules')
export class CommissionRuleController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  @RequiresPerm(PermCode.FINANCE_WRITE)
  list(@CurrentScope() scope: RequestScope) {
    return this.settlementService.listCommissionRules(scope);
  }

  @Get(':id')
  @RequiresPerm(PermCode.FINANCE_WRITE)
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.settlementService.findCommissionRule(scope, id);
  }

  @Post()
  @RequiresPerm(PermCode.FINANCE_WRITE)
  create(@CurrentScope() scope: RequestScope, @Body() dto: CreateCommissionRuleDto) {
    return this.settlementService.createCommissionRule(scope, dto);
  }

  @Put(':id')
  @RequiresPerm(PermCode.FINANCE_WRITE)
  update(
    @Param('id') id: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    return this.settlementService.updateCommissionRule(scope, id, dto);
  }
}

@Controller('admin/settlement-configs')
export class SettlementConfigController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get(':shopId')
  @RequiresPerm(PermCode.FINANCE_WRITE)
  detail(@Param('shopId') shopId: string, @CurrentScope() scope: RequestScope) {
    return this.settlementService.getSettlementConfig(scope, shopId);
  }

  /** 切换 mode 时触发 30% 铁律校验（仅 profit_share 方向） */
  @Put(':shopId')
  @RequiresPerm(PermCode.FINANCE_WRITE)
  update(
    @Param('shopId') shopId: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateSettlementConfigDto,
  ) {
    return this.settlementService.updateSettlementConfig(scope, shopId, dto);
  }
}

@Controller('admin/profit-share')
export class ProfitShareController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post()
  @RequiresPerm(PermCode.FINANCE_WRITE)
  share(@CurrentScope() scope: RequestScope, @Body() dto: ProfitShareDto) {
    return this.settlementService.initiateProfitShare(scope, dto);
  }
}

@Controller('admin/profit-share-orders')
export class ProfitShareOrderController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  @RequiresPerm(PermCode.FINANCE_WRITE)
  list(@CurrentScope() scope: RequestScope) {
    return this.settlementService.listProfitShareOrders(scope);
  }
}

@Controller('admin/commission-details')
export class CommissionDetailController {
  constructor(private readonly settlementService: SettlementService) {}

  /** 抽成明细报表数据源 */
  @Get()
  @RequiresPerm(PermCode.FINANCE_WRITE)
  list(@CurrentScope() scope: RequestScope, @Query() query: CommissionDetailQueryDto) {
    return this.settlementService.listCommissionDetails(scope, query);
  }
}
