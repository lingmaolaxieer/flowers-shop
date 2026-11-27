import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** 扫码出货入参。租户字段由 TenantGuard 从 scope 注入，不接受客户端传参。 */
export class ScanDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  batch?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  loss?: string;

  @IsOptional()
  @IsString()
  deliveryPerson?: string;
}
