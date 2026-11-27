import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PromotionStatus, PromotionType, Status } from '@flower/shared';

export class CreatePromotionDto {
  @IsEnum(PromotionType)
  type: PromotionType;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  mutexGroup?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  mutexGroup?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}

export class CreatePromotionRuleDto {
  /** 叠加/互斥/优先级配置 JSON，结构见 MarketingService 顶部注释 */
  @IsString()
  ruleJson: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: number;
}
