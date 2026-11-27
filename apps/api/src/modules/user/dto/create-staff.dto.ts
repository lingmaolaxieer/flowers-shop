import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  /** 子账号微信 openid（需其先登录一次或直接由后台导入） */
  openid: string;

  @IsString()
  @IsNotEmpty()
  /** 角色码，如 SHOP_STAFF / SUPPLIER_PICKER */
  roleCode: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  shopId?: string;
}
