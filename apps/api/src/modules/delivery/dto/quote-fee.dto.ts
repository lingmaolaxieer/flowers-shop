import { DeliveryMethod } from '@flower/shared';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

/** 下单页配送费试算入参。区域 ID 即租户/批发商归属锚点。 */
export class QuoteFeeDto {
  @IsEnum(DeliveryMethod)
  method: DeliveryMethod;

  @IsString()
  @IsNotEmpty()
  areaId: string;

  /** 重量，单位 kg */
  @IsNumber()
  @Min(0)
  weight: number;

  /** 订单金额，整数分 */
  @IsNumber()
  @Min(0)
  orderAmount: number;
}
