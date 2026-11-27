import { ProfitShareStatus } from '@flower/shared';

/** 分账能力抽象。注入 token：{ provide: PROFIT_SHARE_SERVICE, useClass: XxxProfitShareService } */
export const PROFIT_SHARE_SERVICE = Symbol('PROFIT_SHARE_SERVICE');

export interface ProfitShareParams {
  tenantId: string;
  supplierId: string;
  shopId: string;
  paymentId: string;
  profitShareOrderId: string;
  outTradeNo: string;
  /** 分账接收方账号，需人工配置 */
  receiver: string;
  /** 分账金额，整数分 */
  amount: number;
}

export interface ProfitRollbackParams {
  tenantId: string;
  supplierId: string;
  shopId: string;
  paymentId: string;
  profitShareOrderId: string;
  receiver: string;
  amount: number;
  refundNo: string;
}

export interface ProfitQueryParams {
  tenantId: string;
  paymentId?: string;
  profitShareOrderId?: string;
}

export interface ProfitShareResult {
  status: ProfitShareStatus | string;
  transactionId?: string;
  remark?: string;
}

export interface ProfitQueryResult {
  status: string;
  amount?: number;
}

/**
 * 微信分账抽象。
 * 需人工配置：微信分账权限、APIv3 证书、接收方账号、冻结期（默认 30 天）与 180 天回退窗口。
 */
export abstract class ProfitShareService {
  abstract share(params: ProfitShareParams): Promise<ProfitShareResult>;
  abstract rollback(params: ProfitRollbackParams): Promise<ProfitShareResult>;
  abstract query(params: ProfitQueryParams): Promise<ProfitQueryResult>;
}
