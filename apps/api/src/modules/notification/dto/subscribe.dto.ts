import { IsNotEmpty, IsString } from 'class-validator';

/** 小程序订阅授权回调记录。 */
export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  openid: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsString()
  @IsNotEmpty()
  templateKey: string;
}
