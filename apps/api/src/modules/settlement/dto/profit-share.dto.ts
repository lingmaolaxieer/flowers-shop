import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ProfitShareDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsOptional()
  @IsString()
  /** 分账接收方账号，需人工配置；不传则使用 mock 接收方 */
  receiver?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
