import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class GenerateQrCodeItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  qty: number;

  /** 单位序号起始值，默认 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  unitSeqStart?: number;
}

export class GenerateQrCodesDto {
  /** 订单号（M3 订单主键/单号，用于防伪签名） */
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => GenerateQrCodeItemDto)
  items: GenerateQrCodeItemDto[];
}
