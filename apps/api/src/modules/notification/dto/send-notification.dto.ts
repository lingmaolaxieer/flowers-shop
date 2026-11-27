import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/** 发送微信订阅消息。 */
export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  receiver: string;

  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
