import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 所有实体公共字段。bigint 在 JS 侧用 string 承载，避免精度丢失。 */
// 生产 MySQL 用 bigint；本地 sqlite 演示用 integer（sqlite 的 AUTOINCREMENT 仅支持 INTEGER PRIMARY KEY）
const PK_TYPE = (process.env.DB_TYPE ?? 'mysql') === 'sqlite' ? 'integer' : 'bigint';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: PK_TYPE as 'bigint' | 'integer' })
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
