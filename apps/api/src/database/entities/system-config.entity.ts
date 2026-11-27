import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/** 系统配置字典。M1 使用：订单超时时长、分账比例上限等。 */
@Entity('system_configs')
export class SystemConfig extends BaseEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;
}
