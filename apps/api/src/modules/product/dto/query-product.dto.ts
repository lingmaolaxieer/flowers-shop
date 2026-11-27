import { IsOptional, IsString } from 'class-validator';

export class QueryProductDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
