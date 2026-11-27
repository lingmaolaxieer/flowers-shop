import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateLossDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  skuId: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
