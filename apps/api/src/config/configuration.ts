import { registerAs } from '@nestjs/config';

/**
 * 统一配置。所有环境变量从 apps/api/.env 读取（由 @nestjs/config 自动加载）。
 * 生产环境必须替换 JWT_SECRET 与微信密钥。
 *
 * 本地演示模式：设置 DB_TYPE=sqlite 即可零依赖启动（无需 Docker/MySQL），
 * 数据库文件默认 apps/api/demo.sqlite。生产仍使用 mysql + migration。
 */
export default registerAs('app', () => {
  const dbType = (process.env.DB_TYPE ?? 'mysql') as 'mysql' | 'sqlite';
  const isSqlite = dbType === 'sqlite';

  const db = isSqlite
    ? {
        type: 'better-sqlite3' as const,
        database: process.env.SQLITE_PATH ?? 'demo.sqlite',
        synchronize: true, // 演示模式：按实体自动建表，跳过 MySQL 专有迁移
        logging: false,
      }
    : {
        type: 'mysql' as const,
        host: process.env.MYSQL_HOST ?? '127.0.0.1',
        port: Number(process.env.MYSQL_PORT ?? 3306),
        username: process.env.MYSQL_USER ?? 'root',
        password: process.env.MYSQL_PASSWORD ?? 'rootpass123',
        database: process.env.MYSQL_DB ?? 'flower_ws',
        synchronize: false, // 生产一律走 migration，禁止自动同步
        charset: 'utf8mb4',
        logging: (process.env.NODE_ENV ?? 'development') === 'development',
      };

  return {
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    dbType,
    db,
    jwt: {
      secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
      accessTtl: process.env.JWT_ACCESS_TTL ?? '7d',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    },
    redis: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
    wechat: {
      appId: process.env.WX_APPID ?? '',
      appSecret: process.env.WX_APPSECRET ?? '',
      /** true = 无真实 AppID 时走 Mock 登录，便于本地自测 */
      mockLogin: (process.env.WX_MOCK_LOGIN ?? 'true') !== 'false',
    },
  };
});
