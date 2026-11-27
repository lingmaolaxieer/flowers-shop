import { IsArray, IsEnum } from 'class-validator';
import { PermCode } from '@flower/shared';

export class AssignPermsDto {
  @IsArray()
  @IsEnum(PermCode, { each: true })
  permCodes: PermCode[];
}
