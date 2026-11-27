import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload, RequestScope } from '../interfaces/jwt-payload.interface';

/** 注入当前 JWT 用户。 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);

/** 注入服务端强制作用域（tenant/supplier/shop），永远不信任客户端传参。 */
export const CurrentScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestScope => {
    const request = ctx.switchToHttp().getRequest();
    return request.scope as RequestScope;
  },
);
