import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermCode } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { ReconciliationService } from './reconciliation.service';
import { GenerateStatementsDto } from './dto/generate-statements.dto';
import { StatementQueryDto } from './dto/statement-query.dto';

@Controller('admin/settlement-statements')
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  /** 生成周期对账单（财务写权限） */
  @Post('generate')
  @RequiresPerm(PermCode.FINANCE_WRITE)
  generate(
    @Body() dto: GenerateStatementsDto,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.generateStatements(scope, dto, user);
  }

  /** 对账单列表 */
  @Get()
  list(@Query() query: StatementQueryDto, @CurrentScope() scope: RequestScope) {
    return this.service.findAll(scope, query);
  }

  /** 店家确认（小程序调用） */
  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.shopConfirm(scope, id, user);
  }

  /** 批发商审核 */
  @Post(':id/review')
  review(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.service.supplierReview(scope, id, user);
  }

  /** 导出对账单 Excel（直接返回下载流） */
  @Get(':id/export')
  async export(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Res() res: Response,
  ) {
    const result = await this.service.exportStatement(scope, id, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-File-Url', encodeURIComponent(result.fileUrl));
    res.send(result.buffer);
  }
}
