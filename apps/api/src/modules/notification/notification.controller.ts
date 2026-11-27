import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { NotificationBizService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { SendVoiceDto } from './dto/send-voice.dto';
import { SubscribeDto } from './dto/subscribe.dto';

/** 小程序端：记录订阅授权 */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationBizService) {}

  @Post('subscribe')
  subscribe(
    @CurrentUser() user: JwtPayload,
    @CurrentScope() scope: RequestScope,
    @Body() dto: SubscribeDto,
  ) {
    return this.notificationService.subscribe(user.sub, scope, dto);
  }
}

/** 管理端：手动发送 / 语音播报 / 日志 */
@Controller('admin/notifications')
export class NotificationAdminController {
  constructor(private readonly notificationService: NotificationBizService) {}

  @Post('send')
  @RequiresPerm(PermCode.SERVICE_WRITE)
  send(@CurrentScope() scope: RequestScope, @Body() dto: SendNotificationDto) {
    return this.notificationService.send(scope, dto);
  }

  @Post('voice')
  @RequiresPerm(PermCode.SERVICE_WRITE)
  voice(@CurrentScope() scope: RequestScope, @Body() dto: SendVoiceDto) {
    return this.notificationService.voice(scope, dto);
  }

  @Get('logs')
  @RequiresPerm(PermCode.SERVICE_READ)
  logs(@CurrentScope() scope: RequestScope, @Query('templateKey') templateKey?: string) {
    return this.notificationService.logs(scope, templateKey);
  }
}
