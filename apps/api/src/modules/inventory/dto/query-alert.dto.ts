import { IsOptional, IsString } from 'class-validator';
import { StockAlertStatus } from '@flower/shared';

export class QueryAlertDto {
  @IsOptional()
  @IsString()
  status?: StockAlertStatus;
}
