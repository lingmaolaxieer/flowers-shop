import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { CommissionDimension } from '@flower/shared';

export class CreateCommissionRuleDto {
  @IsEnum(CommissionDimension)
  dimension: CommissionDimension;

  @IsOptional()
  @IsString()
  /** 依 dimension 解释为配送方式 / 花店ID / 类目ID，空为通配 */
  targetValue?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  ratio: number;

  @IsInt()
  priority: number;

  @IsOptional()
  @IsString()
  mutexGroup?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}

export class UpdateCommissionRuleDto {
  @IsOptional()
  @IsEnum(CommissionDimension)
  dimension?: CommissionDimension;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ratio?: number;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  mutexGroup?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
