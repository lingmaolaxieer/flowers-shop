import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PermCode, ReportType } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { ReportService } from './report.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { WebhookSubscribeDto } from './dto/webhook-subscribe.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Controller('admin/reports')
export class ReportController {
  constructor(private readonly service: ReportService) {}

  /** 导出历史（注意：该路由须声明在 :type 之前） */
  @Get('exports')
  @RequiresPerm(PermCode.EXPORT_READ)
  exports(@CurrentScope() scope: RequestScope) {
    return this.service.findExports(scope);
  }

  /** 8 类报表查询 */
  @Get(':type')
  @RequiresPerm(PermCode.EXPORT_READ)
  query(
    @Param('type', new ParseEnumPipe(ReportType)) type: ReportType,
    @Query() query: ReportQueryDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.query(scope, type, query);
  }

  /** 导出 Excel（直接返回下载流） */
  @Post(':type/export')
  @RequiresPerm(PermCode.EXPORT_READ)
  async export(
    @Param('type', new ParseEnumPipe(ReportType)) type: ReportType,
    @Body() body: ReportQueryDto,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Res() res: Response,
  ) {
    const result = await this.service.export(scope, type, body, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-File-Url', encodeURIComponent(result.fileUrl));
    res.send(result.buffer);
  }
}

@Controller('admin/audit-logs')
export class AuditLogController {
  constructor(private readonly service: ReportService) {}

  @Get()
  @RequiresPerm(PermCode.AUDIT_READ)
  list(@Query() query: AuditLogQueryDto, @CurrentScope() scope: RequestScope) {
    return this.service.findAuditLogs(scope, query);
  }
}

@Controller('admin/webhooks')
export class WebhookController {
  constructor(private readonly service: ReportService) {}

  @Post('subscribe')
  subscribe(@Body() dto: WebhookSubscribeDto, @CurrentScope() scope: RequestScope) {
    return this.service.subscribeWebhook(scope, dto);
  }
}
