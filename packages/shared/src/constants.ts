/** 微信分账最高比例：默认不超过订单金额的 30%，且只能按金额分账 */
export const PROFIT_SHARE_MAX_RATIO = 0.3;

/** JWT 有效期 */
export const JWT_ACCESS_TTL = '7d';
export const JWT_REFRESH_TTL = '30d';

/** JWT payload 中当前身份 ID 的字段名 */
export const JWT_IDENTITY_ID_KEY = 'identityId';

/** 金额单位：分。所有金额字段以整数分存储，避免浮点误差。 */
export const MONEY_UNIT = 'fen';

/** 平台默认租户 ID（种子脚本创建） */
export const DEFAULT_PLATFORM_TENANT_ID = 1;
