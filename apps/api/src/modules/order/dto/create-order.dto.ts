import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryMethod } from '@flower/shared';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @IsInt()
  @Min(1)
  qty: number;

  /** 顾客零售价，单位：分 */
  @IsInt()
  @Min(0)
  retailPrice: number;

  /** 店家/批发价，单位：分，仅店家/批发商可读 */
  @IsInt()
  @Min(0)
  wholesalePrice: number;

  /** 商品名称快照；不传时落库为空串，由后续 M2 商品服务回填 */
  @IsOptional()
  @IsString()
  productName?: string;

  /** 计量单位快照；不传时落库为空串 */
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateOrderAddressDto {
  @IsString()
  @IsNotEmpty()
  receiver: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  /** delivery（配送）/ pickup（自提） */
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  areaId?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  address: CreateOrderAddressDto;

  @IsOptional()
  @IsString()
  remark?: string;
}
