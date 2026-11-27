import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductUnit } from '@flower/shared';

export class ImportSkuDto {
  @IsString()
  @IsNotEmpty()
  unit: ProductUnit;

  @IsInt()
  @Min(0)
  retailPrice: number;

  @IsOptional()
  @IsString()
  barcode?: string;
}

export class ImportProductItemDto {
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportSkuDto)
  skus: ImportSkuDto[];
}

export class ImportProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductItemDto)
  items: ImportProductItemDto[];
}
