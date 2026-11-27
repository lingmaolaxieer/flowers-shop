import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** 语音播报；未配置模板时直接用 content 播报。 */
export class SendVoiceDto {
  @IsString()
  @IsNotEmpty()
  receiver: string;

  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @IsOptional()
  @IsString()
  content?: string;
}
