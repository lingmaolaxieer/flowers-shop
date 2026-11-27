import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from '../../database/entities/shop.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { WebhookSubscription } from '../../database/entities/webhook-subscription.entity';
import { ReportExport } from '../../database/entities/report-export.entity';
import {
  CommissionDetail,
  InventoryLog,
  LossRecord,
  Order,
  OrderItem,
  Presale,
  Product,
  ProductSku,
  Refund,
  SettlementStatement,
  Shipment,
} from '../../database/entities';
import {
  AuditLogController,
  ReportController,
  WebhookController,
} from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      ProductSku,
      InventoryLog,
      LossRecord,
      CommissionDetail,
      SettlementStatement,
      Shipment,
      Refund,
      Presale,
      Shop,
      ReportExport,
      AuditLog,
      WebhookSubscription,
    ]),
  ],
  controllers: [ReportController, AuditLogController, WebhookController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
