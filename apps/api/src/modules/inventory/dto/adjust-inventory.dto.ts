import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdjustInventoryDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  skuId: string;

  /** 有符号调整量：正数入库，负数出库 */
  @IsInt()
  qty: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
