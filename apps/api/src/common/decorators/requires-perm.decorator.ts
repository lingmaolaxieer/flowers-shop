import { SetMetadata } from '@nestjs/common';
import { PermCode } from '@flower/shared';

export const PERMS_KEY = 'requiredPerms';

/** 声明接口所需权限（全部满足才放行），由 RbacGuard 消费。 */
export const RequiresPerm = (...perms: PermCode[]) => SetMetadata(PERMS_KEY, perms);
