import 'reflect-metadata';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// 供 TypeORM CLI（migration / seed）直接运行时加载 .env
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const isSqlite = (process.env.DB_TYPE ?? 'mysql') === 'sqlite';

const common = {
  entities: [path.join(__dirname, 'entities/*.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  logging: false,
};

const options: DataSourceOptions = isSqlite
  ? ({
      ...common,
      type: 'better-sqlite3',
      database: process.env.SQLITE_PATH ?? 'demo.sqlite',
      synchronize: true, // 演示模式：按实体自动建表
    } as DataSourceOptions)
  : ({
      ...common,
      type: 'mysql',
      host: process.env.MYSQL_HOST ?? '127.0.0.1',
      port: Number(process.env.MYSQL_PORT ?? 3306),
      username: process.env.MYSQL_USER ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? 'rootpass123',
      database: process.env.MYSQL_DB ?? 'flower_ws',
      synchronize: false, // 强制走 migration，禁止自动同步
      charset: 'utf8mb4',
    } as DataSourceOptions);

export const AppDataSource = new DataSource(options);
