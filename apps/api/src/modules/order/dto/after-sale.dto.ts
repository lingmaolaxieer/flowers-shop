import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AfterSaleType } from '@flower/shared';

export class AfterSaleDto {
  @IsEnum(AfterSaleType)
  type: AfterSaleType;

  /** 退款金额，单位：分。不传时：全额退款取订单应付金额，部分退款必须显式传入。 */
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  /** 价差，单位：分。价差类型必填。 */
  @IsOptional()
  @IsInt()
  @Min(0)
  priceDiff?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
