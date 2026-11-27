import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommissionDimension } from '@flower/shared';

export class CommissionDetailQueryDto {
  @IsOptional()
  @IsEnum(CommissionDimension)
  dimension?: CommissionDimension;

  @IsOptional()
  @IsString()
  orderNo?: string;
}
