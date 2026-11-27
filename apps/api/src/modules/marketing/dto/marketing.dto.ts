import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SimulateItemDto {
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @IsInt()
  @Min(1)
  qty: number;

  /** 单价，整数分 */
  @IsInt()
  @Min(0)
  unitPrice: number;
}

export class SimulateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimulateItemDto)
  items: SimulateItemDto[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  /** 会员等级，未提供则会员价不参与试算 */
  @IsOptional()
  @IsString()
  memberLevel?: string;
}

export class IssueCouponDto {
  @IsString()
  @IsNotEmpty()
  couponId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class UseCouponDto {
  @IsString()
  @IsNotEmpty()
  userCouponId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class AdjustPointsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  /** 非零整数，正增负减 */
  @IsInt()
  change: number;

  @IsOptional()
  @IsString()
  refType?: string;

  @IsOptional()
  @IsString()
  refNo?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
