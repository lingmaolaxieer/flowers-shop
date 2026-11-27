import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductUnit } from '@flower/shared';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

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

  @IsOptional()
  @IsInt()
  status?: number;

  /** 可选：同时更新默认 SKU 的单位与零售价（分） */
  @IsOptional()
  @IsString()
  unit?: ProductUnit;

  @IsOptional()
  @IsInt()
  @Min(0)
  retailPrice?: number;
}
