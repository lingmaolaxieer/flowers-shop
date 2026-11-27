import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { RoleModule } from './modules/role/role.module';
import { ShopModule } from './modules/shop/shop.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { UserModule } from './modules/user/user.module';
// M2 商品/价格/库存
import { ProductModule } from './modules/product/product.module';
import { PriceModule } from './modules/price/price.module';
import { InventoryModule } from './modules/inventory/inventory.module';
// M3 订单
import { OrderModule } from './modules/order/order.module';
// M4 二维码出货
import { QrCodeModule } from './modules/qrcode/qrcode.module';
// M5 支付/结算
import { SettlementModule } from './modules/settlement/settlement.module';
import { PaymentModule } from './modules/payment/payment.module';
// M6 配送/通知
import { DeliveryModule } from './modules/delivery/delivery.module';
import { NotificationModule } from './modules/notification/notification.module';
// M7 营销
import { MarketingModule } from './modules/marketing/marketing.module';
// M8 对账/报表
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { ReportModule } from './modules/report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(), // 定时任务：超时取消 / 对账生成
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): any => {
        const db = config.get('app.db') as Record<string, unknown>;
        const base = { autoLoadEntities: true } as Record<string, unknown>;
        // 本地演示：DB_TYPE=sqlite 时按实体自动建表；生产 mysql 一律走 migration
        return { ...base, ...db };
      },
    }),
    // 全局守卫需要 JwtService；与 AuthModule 使用相同 secret
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.secret'),
        signOptions: { expiresIn: config.get<string>('app.jwt.accessTtl') ?? '7d' },
      }),
    }),
    AuthModule,
    ShopModule,
    RoleModule,
    UserModule,
    SupplierModule,
    // M2
    ProductModule,
    PriceModule,
    InventoryModule,
    // M3
    OrderModule,
    // M4
    QrCodeModule,
    // M5（SettlementModule 只注册一次；PaymentModule 内部已 import）
    SettlementModule,
    PaymentModule,
    // M6
    DeliveryModule,
    NotificationModule,
    // M7
    MarketingModule,
    // M8
    ReconciliationModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [
    // 顺序：先解析 JWT → 再注入租户 scope → 最后校验权限
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
