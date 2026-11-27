import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationService,
  SubscribeParams,
  SubscribeResult,
  VoiceParams,
  VoiceResult,
} from './notification.service';

/**
 * 通知渠道 Mock 实现（console.log 模拟发送）。
 * 需人工配置：微信订阅消息模板ID/AppID，语音播报环境。
 * 生产接入时在 NotificationModule 中把 NOTIFICATION_SERVICE 绑定到真实实现。
 */
@Injectable()
export class MockNotificationService extends NotificationService {
  private readonly logger = new Logger('MockNotificationService');

  async sendSubscribe(params: SubscribeParams): Promise<SubscribeResult> {
    const message = `[Mock订阅消息] openid=${params.openid} templateId=${params.templateId} templateKey=${params.templateKey} data=${JSON.stringify(params.data ?? {})}`;
    console.log(message);
    this.logger.log(message);
    return { success: true };
  }

  async sendVoice(params: VoiceParams): Promise<VoiceResult> {
    const message = `[Mock语音播报] receiver=${params.receiver} templateKey=${params.templateKey ?? '-'} content=${params.content}`;
    console.log(message);
    this.logger.log(message);
    return { success: true };
  }
}
