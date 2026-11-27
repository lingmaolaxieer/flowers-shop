import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class WebhookSubscribeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  event: string;

  @IsUrl({ require_tld: false })
  @MaxLength(512)
  callbackUrl: string;
}
