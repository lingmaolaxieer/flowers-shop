import { ShipmentStatus } from '@flower/shared';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** 人工录入/修改运单号。 */
export class UpdateTrackingDto {
  @IsString()
  @IsNotEmpty()
  trackingNo: string;

  @IsOptional()
  @IsDateString()
  eta?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;
}
