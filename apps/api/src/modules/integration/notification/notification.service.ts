/**
 * 通知渠道抽象层：订阅消息 / 语音播报均为可替换 Provider。
 * 真实实现（微信订阅消息 API、语音网关）实现本抽象类后替换 NOTIFICATION_SERVICE 绑定即可。
 */

/** 注入 token：{ provide: NOTIFICATION_SERVICE, useClass: XxxNotificationService } */
export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';

export interface SubscribeParams {
  openid: string;
  templateId: string;
  templateKey: string;
  data?: Record<string, unknown>;
  page?: string;
}

export interface VoiceParams {
  /** 接收方标识（openid / 设备号 / 号码） */
  receiver: string;
  content: string;
  templateKey?: string;
}

export interface SubscribeResult {
  success: boolean;
  errCode?: number;
}

export interface VoiceResult {
  success: boolean;
}

export abstract class NotificationService {
  abstract sendSubscribe(params: SubscribeParams): Promise<SubscribeResult>;
  abstract sendVoice(params: VoiceParams): Promise<VoiceResult>;
}
