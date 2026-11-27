import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdateDailyQuoteDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveDate 必须为 YYYY-MM-DD' })
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  timeSlot?: string;
}
