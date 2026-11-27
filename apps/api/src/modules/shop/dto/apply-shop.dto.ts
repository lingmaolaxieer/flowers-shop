import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApplyShopDto {
  @IsString()
  @IsNotEmpty()
  /** 花店名称 */
  name: string;

  @IsString()
  @IsNotEmpty()
  /** 营业执照号（需人工核验真伪） */
  licenseNo: string;

  @IsString()
  @IsNotEmpty()
  /** 联系电话 */
  contactPhone: string;

  @IsOptional()
  @IsString()
  /** 营业执照图片 URL（M2 接入对象存储后上传） */
  licenseImage?: string;

  @IsOptional()
  @IsString()
  /** 指定批发商；不传则使用当前默认批发商（单批发商自营阶段） */
  supplierId?: string;
}
