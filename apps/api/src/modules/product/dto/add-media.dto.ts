import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddMediaDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  type?: 'image' | 'video';

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
