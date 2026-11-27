import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateTierDto {
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @IsInt()
  @Min(1)
  minQty: number;

  /** 阶梯批发价，单位：分 */
  @IsInt()
  @Min(0)
  price: number;
}
