import { IsOptional, IsString } from 'class-validator';

export class QueryInventoryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  skuId?: string;
}
