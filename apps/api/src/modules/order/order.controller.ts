import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { AfterSaleDto } from './dto/after-sale.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.create(user, scope, dto);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.orderService.findMyOrders(user.sub, scope, query);
  }

  @Get(':id')
  detail(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.findOne(id, user, scope);
  }

  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.confirm(id, user, scope);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancel(id, user, scope, dto);
  }

  @Post(':id/messages')
  createMessage(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: CreateMessageDto,
  ) {
    return this.orderService.createMessage(id, user, scope, dto);
  }

  @Get(':id/messages')
  listMessages(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.listMessages(id, user, scope);
  }
}

@Controller('admin/orders')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @RequiresPerm(PermCode.ORDER_READ)
  list(@CurrentScope() scope: RequestScope, @Query() query: ListOrdersQueryDto) {
    return this.orderService.adminList(scope, query);
  }

  @Get(':id')
  @RequiresPerm(PermCode.ORDER_READ)
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.orderService.adminDetail(id, scope);
  }

  @Post(':id/accept')
  @RequiresPerm(PermCode.ORDER_WRITE)
  accept(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.accept(id, user, scope);
  }

  @Post(':id/pick')
  @RequiresPerm(PermCode.ORDER_WRITE)
  pick(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.pick(id, user, scope);
  }

  @Post(':id/ship')
  @RequiresPerm(PermCode.ORDER_WRITE)
  ship(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.ship(id, user, scope);
  }

  @Post(':id/deliver')
  @RequiresPerm(PermCode.ORDER_WRITE)
  deliver(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.deliver(id, user, scope);
  }

  @Post(':id/complete')
  @RequiresPerm(PermCode.ORDER_WRITE)
  complete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.complete(id, user, scope);
  }

  @Post(':id/after-sale')
  @RequiresPerm(PermCode.ORDER_WRITE)
  afterSale(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: AfterSaleDto,
  ) {
    return this.orderService.afterSale(id, user, scope, dto);
  }

  /** 售后收口：branch → after_sale_done */
  @Post(':id/after-sale/done')
  @RequiresPerm(PermCode.ORDER_WRITE)
  finishAfterSale(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.orderService.finishAfterSale(id, user, scope);
  }
}
