import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionDetail } from '../../database/entities/commission-detail.entity';
import { CommissionRule } from '../../database/entities/commission-rule.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Payment } from '../../database/entities/payment.entity';
import { PaymentCallback } from '../../database/entities/payment-callback.entity';
import { ProfitShareOrder } from '../../database/entities/profit-share-order.entity';
import { Refund } from '../../database/entities/refund.entity';
import { SettlementConfig } from '../../database/entities/settlement-config.entity';
import { SettlementStatement } from '../../database/entities/settlement-statement.entity';
import { SettlementStatementItem } from '../../database/entities/settlement-statement-item.entity';
import { CommissionService } from '../integration/payment/commission.service';
import { MockPaymentService } from '../integration/payment/mock-payment.service';
import { MockProfitShareService } from '../integration/payment/mock-profit-share.service';
import { PAYMENT_SERVICE } from '../integration/payment/payment.service';
import { PROFIT_SHARE_SERVICE } from '../integration/payment/profit-share.service';
import { SettlementService } from '../integration/payment/settlement.service';
import {
  CommissionDetailController,
  CommissionRuleController,
  ProfitShareController,
  ProfitShareOrderController,
  SettlementConfigController,
} from './settlement.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentCallback,
      CommissionRule,
      SettlementConfig,
      ProfitShareOrder,
      Refund,
      CommissionDetail,
      SettlementStatement,
      SettlementStatementItem,
      Invoice,
    ]),
  ],
  controllers: [
    CommissionRuleController,
    SettlementConfigController,
    ProfitShareController,
    ProfitShareOrderController,
    CommissionDetailController,
  ],
  providers: [
    SettlementService,
    CommissionService,
    /** 需人工配置：替换为真实微信支付 v3 实现 */
    { provide: PAYMENT_SERVICE, useClass: MockPaymentService },
    /** 需人工配置：替换为真实微信分账实现（权限/证书/冻结期） */
    { provide: PROFIT_SHARE_SERVICE, useClass: MockProfitShareService },
  ],
  exports: [SettlementService, CommissionService, PAYMENT_SERVICE, PROFIT_SHARE_SERVICE],
})
export class SettlementModule {}
