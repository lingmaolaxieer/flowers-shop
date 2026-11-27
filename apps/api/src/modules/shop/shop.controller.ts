import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuditStatus, PermCode } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { ShopService } from './shop.service';
import { ApplyShopDto } from './dto/apply-shop.dto';
import { AuditShopDto } from './dto/audit-shop.dto';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('apply')
  apply(
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: ApplyShopDto,
  ) {
    return this.shopService.apply(user.sub, scope, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.shopService.findMine(user.sub);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.shopService.findOne(id, scope);
  }
}

@Controller('admin/shop-audits')
export class ShopAuditController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  @RequiresPerm(PermCode.AUDIT_READ)
  list(@CurrentScope() scope: RequestScope, @Query('status') status?: AuditStatus) {
    return this.shopService.listAudits(scope, status);
  }

  @Post(':id/approve')
  @RequiresPerm(PermCode.AUDIT_WRITE)
  approve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: AuditShopDto,
  ) {
    return this.shopService.approve(id, user.sub, scope, dto.remark);
  }

  @Post(':id/reject')
  @RequiresPerm(PermCode.AUDIT_WRITE)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: AuditShopDto,
  ) {
    return this.shopService.reject(id, user.sub, scope, dto.remark);
  }
}
