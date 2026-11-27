import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateShopSpecificDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  skuId: string;

  /** 专属批发价，单位：分 */
  @IsInt()
  @Min(0)
  price: number;
}
