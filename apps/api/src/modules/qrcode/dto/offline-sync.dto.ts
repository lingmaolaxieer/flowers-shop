import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OfflineScanItemDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  /** 客户端生成的幂等键，租户内唯一 */
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsString()
  @IsNotEmpty()
  operatorId: string;

  /** 离线扫码时间（ISO8601） */
  @IsOptional()
  @IsISO8601()
  scannedAt?: string;

  @IsOptional()
  @IsString()
  batch?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  loss?: string;

  @IsOptional()
  @IsString()
  deliveryPerson?: string;
}

export class OfflineSyncDto {
  /** 客户端离线批次号 */
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OfflineScanItemDto)
  items: OfflineScanItemDto[];
}
