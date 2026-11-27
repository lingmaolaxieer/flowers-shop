import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from '../../database/entities/shop.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { ReportExport } from '../../database/entities/report-export.entity';
import {
  CommissionDetail,
  Order,
  Refund,
  SettlementStatement,
  SettlementStatementItem,
} from '../../database/entities';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shop,
      SettlementStatement,
      SettlementStatementItem,
      Order,
      CommissionDetail,
      Refund,
      AuditLog,
      ReportExport,
    ]),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
