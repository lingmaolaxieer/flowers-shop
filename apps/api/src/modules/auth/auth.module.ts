import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Permission,
  Role,
  RolePermission,
  Tenant,
  User,
  UserIdentity,
} from '../../database/entities';
import { WechatService } from '../integration/wechat/wechat.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserIdentity,
      Tenant,
      Role,
      RolePermission,
      Permission,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('app.jwt.accessTtl') ?? '7d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, WechatService],
  exports: [AuthService, WechatService],
})
export class AuthModule {}
