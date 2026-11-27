import { Injectable } from '@nestjs/common';
import { ProfitShareStatus } from '@flower/shared';
import {
  ProfitQueryParams,
  ProfitQueryResult,
  ProfitRollbackParams,
  ProfitShareParams,
  ProfitShareResult,
  ProfitShareService,
} from './profit-share.service';

/**
 * 分账 Mock 实现（本地自测用）。
 * 需人工配置：微信分账权限/证书/冻结期，以及接收方账号真实值；回退须接收方同意后执行。
 */
@Injectable()
export class MockProfitShareService extends ProfitShareService {
  async share(params: ProfitShareParams): Promise<ProfitShareResult> {
    return {
      status: ProfitShareStatus.SUCCESS,
      transactionId: `mock_share_${params.profitShareOrderId}_${Date.now()}`,
      remark: 'mock 分账成功，需人工配置真实微信分账',
    };
  }

  async rollback(params: ProfitRollbackParams): Promise<ProfitShareResult> {
    return {
      status: ProfitShareStatus.ROLLBACK,
      transactionId: `mock_rollback_${params.profitShareOrderId}_${Date.now()}`,
      remark: 'mock 接收方同意分账回退',
    };
  }

  async query(_params: ProfitQueryParams): Promise<ProfitQueryResult> {
    return { status: ProfitShareStatus.SUCCESS };
  }
}
