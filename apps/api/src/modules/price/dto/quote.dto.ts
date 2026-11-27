import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/** 店家取价入参。level 可选：用于命中店家等级价；不传则跳过该优先级。 */
export class QuoteDto {
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsString()
  level?: string;
}
