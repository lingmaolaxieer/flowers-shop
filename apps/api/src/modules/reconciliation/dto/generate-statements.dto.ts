import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateStatementsDto {
  /** 周期类型：日 / 周 / 月 */
  @IsIn(['day', 'week', 'month'])
  cycle: 'day' | 'week' | 'month';

  /**
   * 锚定日期（默认当天）。按该日期的上一个「已完成周期」生成：
   * day=昨天、week=上一自然周(周一至周日)、month=上一自然月。
   */
  @IsOptional()
  @IsDateString()
  date?: string;

  /** 仅生成指定花店；不传则生成 scope 下所有花店 */
  @IsOptional()
  @IsString()
  shopId?: string;

  /** 已存在对账单时是否按周期汇总覆盖重建，默认 false（跳过） */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
