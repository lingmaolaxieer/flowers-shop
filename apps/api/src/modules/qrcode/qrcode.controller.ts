import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { GenerateQrCodesDto } from './dto/generate-qr-codes.dto';
import { OfflineSyncDto } from './dto/offline-sync.dto';
import { QrCodeQueryDto } from './dto/qr-code-query.dto';
import { ScanRecordQueryDto } from './dto/scan-record-query.dto';
import { ScanDto } from './dto/scan.dto';
import { QrCodeService } from './qr-code.service';
import { ScanService } from './scan.service';

/** 扫码出货（拣货端） */
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post('scan')
  @RequiresPerm(PermCode.QR_PRINT)
  scan(
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: ScanDto,
  ) {
    return this.scanService.scan(scope, dto.code, user.sub, {
      batch: dto.batch,
      weight: dto.weight,
      loss: dto.loss,
      deliveryPerson: dto.deliveryPerson,
    });
  }

  @Post('offline-sync')
  @RequiresPerm(PermCode.QR_PRINT)
  offlineSync(@CurrentScope() scope: RequestScope, @Body() dto: OfflineSyncDto) {
    return this.scanService.offlineSync(scope, dto.batchId, dto.items);
  }
}

/** 二维码管理（批发商后台） */
@Controller('admin/qr-codes')
export class AdminQrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Post('generate')
  @RequiresPerm(PermCode.QR_PRINT)
  generate(@CurrentScope() scope: RequestScope, @Body() dto: GenerateQrCodesDto) {
    return this.qrCodeService.generateQrCodes(scope, dto.orderId, dto.items);
  }

  @Get()
  @RequiresPerm(PermCode.QR_PRINT)
  list(@CurrentScope() scope: RequestScope, @Query() query: QrCodeQueryDto) {
    return this.qrCodeService.list(scope, query);
  }
}

/** 扫码记录管理 / 导出（M8 导出数据查询） */
@Controller('admin/scan-records')
export class AdminScanRecordController {
  constructor(private readonly scanService: ScanService) {}

  @Get()
  @RequiresPerm(PermCode.QR_PRINT)
  list(@CurrentScope() scope: RequestScope, @Query() query: ScanRecordQueryDto) {
    return this.scanService.listScanRecords(scope, query);
  }

  @Get('export')
  @RequiresPerm(PermCode.QR_PRINT)
  export(@CurrentScope() scope: RequestScope, @Query() query: ScanRecordQueryDto) {
    return this.scanService.exportScanRecords(scope, query);
  }
}
