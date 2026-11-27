import { Module } from '@nestjs/common';
import { SettlementModule } from '../settlement/settlement.module';
import { PaymentController, RefundController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [SettlementModule],
  controllers: [PaymentController, RefundController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
