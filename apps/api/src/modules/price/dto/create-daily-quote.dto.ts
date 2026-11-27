import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateDailyQuoteDto {
  @IsString()
  @IsNotEmpty()
  skuId: string;

  /** 批发价，单位：分 */
  @IsInt()
  @Min(0)
  price: number;

  /** 生效日期，格式 '2026-11-27' */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveDate 必须为 YYYY-MM-DD' })
  effectiveDate: string;

  @IsOptional()
  @IsString()
  timeSlot?: string;
}
