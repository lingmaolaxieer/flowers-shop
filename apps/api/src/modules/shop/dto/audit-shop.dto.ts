import { IsOptional, IsString } from 'class-validator';

export class AuditShopDto {
  @IsOptional()
  @IsString()
  remark?: string;
}
