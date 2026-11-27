import { PermCode, RoleCode } from '@flower/shared';

/** JWT 载荷：身份切换后重新签发，scope 与 perms 随之变化。 */
export interface JwtPayload {
  /** 用户 ID */
  sub: string;
  /** 当前身份 ID */
  identityId: string;
  /** 当前角色码 */
  roleCode: RoleCode;
  /** 当前租户 ID（服务端强制注入，禁止客户端传参） */
  tenantId: string;
  supplierId?: string;
  shopId?: string;
  /** 当前角色权限码集合 */
  perms: PermCode[];
  iat?: number;
  exp?: number;
}

export interface RequestScope {
  tenantId: string;
  supplierId?: string;
  shopId?: string;
}
