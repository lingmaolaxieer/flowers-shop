import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderMessageType } from '@flower/shared';

export class CreateMessageDto {
  @IsEnum(OrderMessageType)
  type: OrderMessageType;

  /** TEXT 类型必填 */
  @IsOptional()
  @IsString()
  content?: string;

  /** PHONE 类型必填 */
  @IsOptional()
  @IsString()
  phone?: string;
}
