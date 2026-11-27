import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IdentityScope } from '@flower/shared';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  roleCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(IdentityScope)
  scope: IdentityScope;
}
