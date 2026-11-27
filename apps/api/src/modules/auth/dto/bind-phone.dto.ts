import { IsNotEmpty, IsString } from 'class-validator';

export class BindPhoneDto {
  @IsString()
  @IsNotEmpty()
  /** wx.getPhoneNumber 回调返回的 code */
  code: string;
}
