import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status } from '@flower/shared';
import { NotificationLog } from '../../database/entities/notification-log.entity';
import { NotificationTemplate } from '../../database/entities/notification-template.entity';
import { SubscriptionRecord } from '../../database/entities/subscription-record.entity';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import {
  NOTIFICATION_SERVICE,
  NotificationService,
} from '../integration/notification/notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { SendVoiceDto } from './dto/send-voice.dto';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NotificationBizService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(SubscriptionRecord)
    private readonly subscriptionRepo: Repository<SubscriptionRecord>,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @Inject(NOTIFICATION_SERVICE)
    private readonly gateway: NotificationService,
  ) {}

  /** 记录用户订阅授权 */
  async subscribe(userId: string, scope: RequestScope, dto: SubscribeDto) {
    const record = await this.subscriptionRepo.save(
      this.subscriptionRepo.create({
        tenantId: scope.tenantId,
        userId,
        openid: dto.openid,
        templateId: dto.templateId,
        templateKey: dto.templateKey,
        status: Status.ENABLED,
      }),
    );
    return { id: record.id, status: record.status };
  }

  /** 发送微信订阅消息，结果写入通知日志 */
  async send(scope: RequestScope, dto: SendNotificationDto) {
    const template = await this.templateRepo.findOne({
      where: {
        tenantId: scope.tenantId,
        templateKey: dto.templateKey,
        channel: 'subscribe',
        status: Status.ENABLED,
      },
    });
    if (!template) throw new BadRequestException('未找到启用的订阅消息模板，请先在后台配置模板ID');

    const result = await this.gateway.sendSubscribe({
      openid: dto.receiver,
      templateId: template.templateId ?? '',
      templateKey: dto.templateKey,
      data: dto.data,
    });
    const log = await this.writeLog(
      scope.tenantId,
      'subscribe',
      dto.receiver,
      dto.templateKey,
      JSON.stringify(dto.data ?? {}),
      result.success ? 'success' : 'failed',
      result.success ? undefined : `errCode=${result.errCode ?? 'unknown'}`,
    );
    return { ...result, logId: log.id };
  }

  /** 语音播报，结果写入通知日志 */
  async voice(scope: RequestScope, dto: SendVoiceDto) {
    const template = await this.templateRepo.findOne({
      where: {
        tenantId: scope.tenantId,
        templateKey: dto.templateKey,
        channel: 'voice',
        status: Status.ENABLED,
      },
    });
    const result = await this.gateway.sendVoice({
      receiver: dto.receiver,
      content: dto.content ?? template?.content ?? dto.templateKey,
      templateKey: dto.templateKey,
    });
    const log = await this.writeLog(
      scope.tenantId,
      'voice',
      dto.receiver,
      dto.templateKey,
      dto.content ?? template?.content ?? undefined,
      result.success ? 'success' : 'failed',
      result.success ? undefined : '语音播报调用失败',
    );
    return { ...result, logId: log.id };
  }

  /** 通知日志（可按 templateKey 过滤） */
  async logs(scope: RequestScope, templateKey?: string) {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (templateKey) where.templateKey = templateKey;
    const logs = await this.logRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
    return logs.map((l) => ({
      id: l.id,
      channel: l.channel,
      receiver: l.receiver,
      templateKey: l.templateKey,
      payload: l.payload ?? null,
      status: l.status,
      error: l.error ?? null,
      createdAt: l.createdAt,
    }));
  }

  private async writeLog(
    tenantId: string,
    channel: string,
    receiver: string,
    templateKey: string,
    payload: string | undefined,
    status: string,
    error?: string,
  ): Promise<NotificationLog> {
    return this.logRepo.save(
      this.logRepo.create({ tenantId, channel, receiver, templateKey, payload, status, error }),
    );
  }
}
