import { IsBoolean, IsEnum } from 'class-validator';
import { SettlementMode } from '@flower/shared';

export class UpdateSettlementConfigDto {
  @IsEnum(SettlementMode)
  mode: SettlementMode;

  @IsBoolean()
  deliveryFeeInCommission: boolean;
}
