import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PaymentHeaders,
  PaymentPrepayParams,
  PaymentPrepayResult,
  PaymentRefundParams,
  PaymentRefundQueryResult,
  PaymentRefundResult,
  PaymentService,
  VerifiedPayment,
} from './payment.service';

/**
 * 支付 Mock 实现（本地自测用）。
 * 需人工配置：替换为真实微信支付 v3 —— 商户号、APIv3 密钥、证书序列号、平台证书验签、JSAPI 下单与退款接口。
 */
@Injectable()
export class MockPaymentService extends PaymentService {
  async prepay(params: PaymentPrepayParams): Promise<PaymentPrepayResult> {
    const prepayId = `mock_prepay_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    return {
      prepayId,
      params: {
        appId: 'mock-appid',
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: `${Date.now()}`,
        package: `prepay_id=${prepayId}`,
        signType: 'RSA2',
        paySign: 'mock-sign',
        outTradeNo: params.outTradeNo,
        amount: params.amount,
      },
    };
  }

  /** 验签直接解析 JSON（真实环境必须使用微信平台证书验签原始报文） */
  async verifyCallback(rawBody: string, _headers: PaymentHeaders): Promise<VerifiedPayment> {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody || '{}') as Record<string, unknown>;
    } catch {
      throw new BadRequestException('回调报文不是合法 JSON');
    }
    const outTradeNo = body['outTradeNo'] ?? body['out_trade_no'];
    const amount = body['amount'] ?? body['total_fee'];
    const transactionId = body['transactionId'] ?? body['transaction_id'];
    if (typeof outTradeNo !== 'string' || !outTradeNo) {
      throw new BadRequestException('回调缺少商户订单号');
    }
    return {
      outTradeNo,
      amount: Number(amount ?? 0),
      transactionId: typeof transactionId === 'string' ? transactionId : `mock_tx_${Date.now()}`,
    };
  }

  async refund(params: PaymentRefundParams): Promise<PaymentRefundResult> {
    return { refundNo: params.refundNo, status: 'success' };
  }

  async query(refundNo: string): Promise<PaymentRefundQueryResult> {
    return { refundNo, status: 'success' };
  }
}
