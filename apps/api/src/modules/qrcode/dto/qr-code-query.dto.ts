import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { QrCodeStatus } from '@flower/shared';

export class QrCodeQueryDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsEnum(QrCodeStatus)
  status?: QrCodeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
