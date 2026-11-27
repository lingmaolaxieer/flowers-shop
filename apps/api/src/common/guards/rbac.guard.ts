import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermCode } from '@flower/shared';
import { PERMS_KEY } from '../decorators/requires-perm.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/** 基于 JWT 中 perms 的权限校验（全部满足才放行）。 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermCode[]>(PERMS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('请先登录');

    const granted = user.perms ?? [];
    const missing = required.filter((p) => !granted.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`权限不足，缺少: ${missing.join(', ')}`);
    }
    return true;
  }
}
