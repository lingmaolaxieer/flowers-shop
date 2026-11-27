import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** 报表查询公共参数。GET 走 query，POST 导出走 body。 */
export class ReportQueryDto {
  /** 起始日期 YYYY-MM-DD，不传默认当月 1 日 */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** 结束日期 YYYY-MM-DD（含当天），不传默认今天 */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** 限定花店；服务端 scope 中的 shopId 优先级更高 */
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number = 1000;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
