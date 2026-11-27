import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateLevelDto {
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @IsString()
  @IsNotEmpty()
  level: string;

  /** 等级批发价，单位：分 */
  @IsInt()
  @Min(0)
  price: number;
}
