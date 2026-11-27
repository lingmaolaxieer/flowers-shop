import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class RefundDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsInt()
  @Min(1)
  /** 退款金额，整数分 */
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
