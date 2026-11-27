/**
 * 启动时环境变量校验。生产环境禁止使用默认密钥、禁止 Mock 登录。
 */
export function validateEnv(): void {
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  const errors: string[] = [];

  if (isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('生产环境必须设置长度 >= 32 的 JWT_SECRET');
    }
    if (!process.env.WX_APPID || !process.env.WX_APPSECRET) {
      errors.push('生产环境必须提供 WX_APPID 与 WX_APPSECRET');
    }
    if ((process.env.WX_MOCK_LOGIN ?? 'true') !== 'false') {
      errors.push('生产环境必须设置 WX_MOCK_LOGIN=false');
    }
  }

  if (errors.length > 0) {
    throw new Error(`环境变量校验失败:\n- ${errors.join('\n- ')}`);
  }
}
