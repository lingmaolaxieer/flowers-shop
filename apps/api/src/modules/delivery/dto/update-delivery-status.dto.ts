import { ShipmentStatus } from '@flower/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateDeliveryStatusDto {
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
