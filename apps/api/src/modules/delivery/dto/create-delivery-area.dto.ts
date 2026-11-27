import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateDeliveryAreaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  rangeDesc?: string;

  /** 基础配送费，整数分 */
  @IsInt()
  @Min(0)
  baseFee: number;

  /** 满额免配门槛，整数分 */
  @IsOptional()
  @IsInt()
  @Min(0)
  freeThreshold?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}
