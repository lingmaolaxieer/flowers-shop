import { IsOptional, IsString, Matches } from 'class-validator';

export class QueryDailyDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveDate 必须为 YYYY-MM-DD' })
  effectiveDate?: string;
}
