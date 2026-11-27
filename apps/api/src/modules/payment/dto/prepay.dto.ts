import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class PrepayDto {
  @IsString()
  @IsNotEmpty()
  /** 订单 ID（由订单模块提供） */
  orderId: string;

  @IsInt()
  @Min(1)
  /** 订单金额，整数分（由订单模块提供） */
  amount: number;

  @IsOptional()
  @IsString()
  subject?: string;
}
