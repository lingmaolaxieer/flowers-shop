import { Column, Entity, Index } from 'typeorm';
import { Status } from '@flower/shared';
import { BaseEntity } from './base.entity';

/** 微信用户本体。同一用户可绑定多个身份。 */
@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  openid: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  unionid?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'tinyint', default: Status.ENABLED })
  status: number;
}
