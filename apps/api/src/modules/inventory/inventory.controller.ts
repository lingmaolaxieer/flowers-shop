import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PermCode, StockAlertStatus } from '@flower/shared';
import {
  CurrentScope,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateLossDto } from './dto/create-loss.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequiresPerm(PermCode.INVENTORY_READ)
  list(@CurrentScope() scope: RequestScope, @Query() query: QueryInventoryDto) {
    return this.inventoryService.list(scope, query);
  }

  @Get('alerts')
  @RequiresPerm(PermCode.INVENTORY_READ)
  alerts(
    @CurrentScope() scope: RequestScope,
    @Query() query: QueryAlertDto,
  ) {
    return this.inventoryService.listAlerts(scope, query.status as StockAlertStatus | undefined);
  }

  @Post('adjust')
  @RequiresPerm(PermCode.INVENTORY_WRITE)
  adjust(
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjust(scope, dto, user.sub);
  }

  @Post('loss')
  @RequiresPerm(PermCode.INVENTORY_WRITE)
  loss(
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: CreateLossDto,
  ) {
    return this.inventoryService.loss(scope, dto, user.sub);
  }

  @Post('alerts/:id/confirm')
  @RequiresPerm(PermCode.INVENTORY_WRITE)
  confirmAlert(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.inventoryService.confirmAlert(id, scope, user.sub);
  }
}
