import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryAreaDto } from './dto/create-delivery-area.dto';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { QuoteFeeDto } from './dto/quote-fee.dto';
import { UpdateDeliveryAreaDto } from './dto/update-delivery-area.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';

/** 配送区域配置（批发商身份） */
@Controller('admin/delivery-areas')
export class DeliveryAreaController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @RequiresPerm(PermCode.SUPPLIER_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.deliveryService.listAreas(scope);
  }

  @Post()
  @RequiresPerm(PermCode.SUPPLIER_WRITE)
  create(@CurrentScope() scope: RequestScope, @Body() dto: CreateDeliveryAreaDto) {
    return this.deliveryService.createArea(scope, dto);
  }

  @Get(':id')
  @RequiresPerm(PermCode.SUPPLIER_READ)
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.deliveryService.getArea(id, scope);
  }

  @Put(':id')
  @RequiresPerm(PermCode.SUPPLIER_WRITE)
  update(
    @Param('id') id: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateDeliveryAreaDto,
  ) {
    return this.deliveryService.updateArea(id, scope, dto);
  }

  /** 兼容按 POST 提交更新的调用方 */
  @Post(':id')
  @RequiresPerm(PermCode.SUPPLIER_WRITE)
  updateByPost(
    @Param('id') id: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateDeliveryAreaDto,
  ) {
    return this.deliveryService.updateArea(id, scope, dto);
  }
}

/** 下单页配送费试算（公开，无需登录） */
@Controller('delivery')
export class DeliveryQuoteController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('quote')
  @Public()
  quote(@Body() dto: QuoteFeeDto) {
    // 公开请求无 JWT/scope，服务层以 areaId 锚定租户并按区域归属取规则。
    return this.deliveryService.quoteFee(undefined, dto);
  }
}

/** 运单人工录入 */
@Controller('admin/shipments')
export class ShipmentController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  @RequiresPerm(PermCode.ORDER_WRITE)
  create(@CurrentScope() scope: RequestScope, @Body() dto: CreateShipmentDto) {
    return this.deliveryService.createShipment(scope, dto);
  }

  @Put(':id/tracking')
  @RequiresPerm(PermCode.ORDER_WRITE)
  updateTracking(
    @Param('id') id: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateTrackingDto,
  ) {
    return this.deliveryService.updateTracking(id, scope, dto);
  }
}

/** 配送员更新配送状态（写状态流水） */
@Controller('admin/delivery')
export class DeliveryStatusController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post(':orderId/status')
  @RequiresPerm(PermCode.ORDER_WRITE)
  updateStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateStatusByOrder(orderId, scope, user.sub, dto);
  }
}

/** 配送员档案 */
@Controller('admin/delivery-persons')
export class DeliveryPersonController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @RequiresPerm(PermCode.SUPPLIER_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.deliveryService.listPersons(scope);
  }

  @Post()
  @RequiresPerm(PermCode.SUPPLIER_WRITE)
  create(@CurrentScope() scope: RequestScope, @Body() dto: CreateDeliveryPersonDto) {
    return this.deliveryService.createPerson(scope, dto);
  }
}
