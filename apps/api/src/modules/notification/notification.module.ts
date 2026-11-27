import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLog } from '../../database/entities/notification-log.entity';
import { NotificationTemplate } from '../../database/entities/notification-template.entity';
import { SubscriptionRecord } from '../../database/entities/subscription-record.entity';
import { NOTIFICATION_SERVICE } from '../integration/notification/notification.service';
import { MockNotificationService } from '../integration/notification/mock-notification.service';
import { NotificationAdminController, NotificationController } from './notification.controller';
import { NotificationBizService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplate, SubscriptionRecord, NotificationLog]),
  ],
  controllers: [NotificationController, NotificationAdminController],
  providers: [
    NotificationBizService,
    // 默认 Mock；接入真实微信订阅消息/语音网关时替换 useClass 即可
    { provide: NOTIFICATION_SERVICE, useClass: MockNotificationService },
  ],
  exports: [NotificationBizService, NOTIFICATION_SERVICE],
})
export class NotificationModule {}
