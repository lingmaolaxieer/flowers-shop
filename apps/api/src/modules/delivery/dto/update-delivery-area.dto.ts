import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDeliveryAreaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rangeDesc?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  baseFee?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeThreshold?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}
