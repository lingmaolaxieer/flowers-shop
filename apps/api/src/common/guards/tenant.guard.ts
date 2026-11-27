import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload, RequestScope } from '../interfaces/jwt-payload.interface';

/**
 * 多租户强隔离：
 * 1. 从 JWT 生成 scope（服务端可信来源）；
 * 2. 清除客户端传入的 tenant_id/supplier_id/shop_id，杜绝伪造越权。
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<
      Request & { user?: JwtPayload; scope?: RequestScope; body?: Record<string, unknown>; query?: Record<string, unknown> }
    >();
    const user = request.user;
    if (!user) throw new UnauthorizedException('未获取到身份信息');

    request.scope = {
      tenantId: user.tenantId,
      supplierId: user.supplierId,
      shopId: user.shopId,
    };

    // 强制剥离客户端伪造的租户字段
    const forgedKeys = ['tenantId', 'tenant_id', 'supplierId', 'supplier_id', 'shopId', 'shop_id'];
    if (request.body) forgedKeys.forEach((k) => delete request.body![k]);
    if (request.query) forgedKeys.forEach((k) => delete request.query![k]);

    return true;
  }
}
