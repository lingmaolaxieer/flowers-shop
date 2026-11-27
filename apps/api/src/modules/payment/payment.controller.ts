import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CurrentScope } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { PaymentService } from './payment.service';
import { PrepayDto } from './dto/prepay.dto';
import { RefundDto } from './dto/refund.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** 发起支付，返回小程序 wx.requestPayment 参数 */
  @Post('prepay')
  prepay(@CurrentScope() scope: RequestScope, @Body() dto: PrepayDto) {
    return this.paymentService.prepay(scope, dto);
  }

  /** 微信支付结果回调（公开）。幂等由 (out_trade_no,event_type) 唯一键保证。 */
  @Post('callback')
  @Public()
  callback(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: Record<string, unknown>,
  ) {
    return this.paymentService.handleCallback(JSON.stringify(body ?? {}), headers);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.paymentService.findOne(id, scope);
  }
}

@Controller('refunds')
export class RefundController {
  constructor(private readonly paymentService: PaymentService) {}

  /** 发起退款，按结算模式自动路由 */
  @Post()
  create(@CurrentScope() scope: RequestScope, @Body() dto: RefundDto) {
    return this.paymentService.refund(scope, dto);
  }

  /** 退款结果回调（公开） */
  @Post('callback')
  @Public()
  callback(@Body() body: Record<string, unknown>) {
    return this.paymentService.refundCallback(body);
  }
}
