import { Injectable } from '@nestjs/common';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { PaymentHeaders } from '../integration/payment/payment.service';
import { SettlementService } from '../settlement/settlement.service';
import { PrepayDto } from './dto/prepay.dto';
import { RefundDto } from './dto/refund.dto';

/** 支付/退款接口层，业务逻辑统一委托给 SettlementService。 */
@Injectable()
export class PaymentService {
  constructor(private readonly settlementService: SettlementService) {}

  prepay(scope: RequestScope, dto: PrepayDto) {
    return this.settlementService.prepay(scope, dto);
  }

  handleCallback(rawBody: string, headers: PaymentHeaders) {
    return this.settlementService.handlePaymentCallback(rawBody, headers);
  }

  findOne(id: string, scope: RequestScope) {
    return this.settlementService.findPayment(id, scope);
  }

  refund(scope: RequestScope, dto: RefundDto) {
    return this.settlementService.createRefund(scope, dto);
  }

  refundCallback(body: Record<string, unknown>) {
    return this.settlementService.refundCallback(body);
  }
}
