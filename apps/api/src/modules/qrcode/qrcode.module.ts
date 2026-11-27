import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCode } from '../../database/entities/qr-code.entity';
import { ScanOfflineQueue } from '../../database/entities/scan-offline-queue.entity';
import { ScanRecord } from '../../database/entities/scan-record.entity';
import { MockPrinterService } from '../integration/printer/mock-printer.service';
import { PRINTER_SERVICE } from '../integration/printer/printer.service';
import {
  AdminQrCodeController,
  AdminScanRecordController,
  ScanController,
} from './qrcode.controller';
import { QrCodeService } from './qr-code.service';
import { ScanService } from './scan.service';

@Module({
  imports: [TypeOrmModule.forFeature([QrCode, ScanRecord, ScanOfflineQueue]), ConfigModule],
  controllers: [ScanController, AdminQrCodeController, AdminScanRecordController],
  providers: [
    QrCodeService,
    ScanService,
    // 可替换 Provider：真机接入时仅替换此处的绑定
    { provide: PRINTER_SERVICE, useClass: MockPrinterService },
  ],
  exports: [QrCodeService, ScanService, PRINTER_SERVICE],
})
export class QrCodeModule {}
