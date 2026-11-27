import { DeliveryMethod } from '@flower/shared';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(DeliveryMethod)
  method: DeliveryMethod;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  /** ISO 时间字符串，预计送达 */
  @IsOptional()
  @IsDateString()
  eta?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  /** 配送费明细 JSON 字符串 */
  @IsOptional()
  @IsString()
  feeBreakdown?: string;
}
