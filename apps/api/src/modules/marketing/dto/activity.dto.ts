import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Status } from '@flower/shared';

export class CreateDailySpecialDto {
  @IsString()
  skuId: string;

  @IsInt()
  @Min(0)
  specialPrice: number;

  @IsOptional()
  @IsString()
  slot?: string;

  /** yyyy-MM-dd */
  @IsString()
  date: string;
}

export class UpdateDailySpecialDto {
  @IsOptional()
  @IsString()
  skuId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  specialPrice?: number;

  @IsOptional()
  @IsString()
  slot?: string;

  @IsOptional()
  @IsString()
  date?: string;
}

export class CreatePresaleDto {
  @IsString()
  skuId: string;

  @IsInt()
  @Min(0)
  deposit: number;

  @IsInt()
  @Min(0)
  balance: number;

  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @Type(() => Date)
  @IsDate()
  endAt: Date;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class UpdatePresaleDto {
  @IsOptional()
  @IsString()
  skuId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  deposit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  balance?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class CreateComboDto {
  @IsString()
  name: string;

  /** JSON 字符串：[{skuId:string,qty:number}] */
  @IsString()
  itemsJson: string;

  @IsInt()
  @Min(0)
  comboPrice: number;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class UpdateComboDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  itemsJson?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  comboPrice?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class CreateCouponDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  /** fixed=立减分；percent=折扣百分比(0-100) */
  @IsIn(['fixed', 'percent'])
  type: string;

  @IsInt()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validTo?: Date;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsIn(['fixed', 'percent'])
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validTo?: Date;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class CreateDiscountRuleDto {
  @IsInt()
  @Min(0)
  threshold: number;

  @IsInt()
  @Min(0)
  discount: number;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class UpdateDiscountRuleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}

export class CreateMemberPriceDto {
  @IsString()
  level: string;

  @IsString()
  skuId: string;

  @IsInt()
  @Min(0)
  price: number;
}

export class UpdateMemberPriceDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  skuId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}

export class CreateTierRuleDto {
  @IsString()
  skuId: string;

  @IsInt()
  @Min(1)
  minQty: number;

  /** 0<discount<1 为折扣率（0.85=85折）；>=1 为立减金额（分） */
  @IsNumber()
  @Min(0)
  discount: number;
}

export class UpdateTierRuleDto {
  @IsOptional()
  @IsString()
  skuId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minQty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}
