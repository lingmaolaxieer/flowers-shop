import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryPersonDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
