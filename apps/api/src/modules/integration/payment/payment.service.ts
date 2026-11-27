/** 支付渠道抽象层。真实实现需替换 Provider，保持接口不变。 */

/** 注入 token：模块中 { provide: PAYMENT_SERVICE, useClass: XxxPaymentService } */
export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');

export type PaymentHeaders = Record<string, string | string[] | undefined>;

export interface PaymentPrepayParams {
  tenantId: string;
  supplierId: string;
  shopId: string;
  orderId: string;
  outTradeNo: string;
  /** 订单金额，整数分 */
  amount: number;
  subject?: string;
}

export interface PaymentPrepayResult {
  prepayId: string;
  /** 直接交给小程序 wx.requestPayment 的参数 */
  params: Record<string, unknown>;
}

/** 验签并解析后的回调数据 */
export interface VerifiedPayment {
  outTradeNo: string;
  amount: number;
  transactionId: string;
}

export interface PaymentRefundParams {
  tenantId: string;
  outTradeNo: string;
  refundNo: string;
  /** 退款金额，整数分 */
  amount: number;
  reason: string;
}

export interface PaymentRefundResult {
  refundNo: string;
  status: string;
}

export interface PaymentRefundQueryResult {
  refundNo: string;
  status: string;
  amount?: number;
  outTradeNo?: string;
}

/** 支付能力抽象。需人工配置：替换为真实微信支付 v3（商户号/证书/验签/退款）。 */
export abstract class PaymentService {
  abstract prepay(params: PaymentPrepayParams): Promise<PaymentPrepayResult>;
  abstract verifyCallback(rawBody: string, headers: PaymentHeaders): Promise<VerifiedPayment>;
  abstract refund(params: PaymentRefundParams): Promise<PaymentRefundResult>;
  abstract query(refundNo: string): Promise<PaymentRefundQueryResult>;
}
