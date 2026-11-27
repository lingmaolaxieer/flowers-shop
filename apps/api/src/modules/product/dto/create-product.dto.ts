import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductUnit } from '@flower/shared';

/** 商品随附的默认 SKU。 */
export class CreateSkuDto {
  @IsString()
  @IsNotEmpty()
  unit: ProductUnit;

  /** 顾客零售价，单位：分 */
  @IsInt()
  @Min(0)
  retailPrice: number;

  @IsOptional()
  @IsString()
  barcode?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  spec?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  bloomPeriod?: string;

  @IsOptional()
  @IsBoolean()
  isPresale?: boolean;

  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ValidateNested()
  @Type(() => CreateSkuDto)
  sku: CreateSkuDto;
}
