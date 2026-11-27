import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsIn, IsOptional, IsString, Max, Min } from 'class-validator';
import { StatementStatus } from '@flower/shared';

export class StatementQueryDto {
  @IsOptional()
  @IsEnum(StatementStatus)
  status?: StatementStatus;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  cycle?: 'day' | 'week' | 'month';

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}
