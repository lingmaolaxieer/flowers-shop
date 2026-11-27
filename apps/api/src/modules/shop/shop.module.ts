import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop, ShopAudit, Supplier, Tenant, UserIdentity } from '../../database/entities';
import { ShopAuditController, ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, ShopAudit, Supplier, Tenant, UserIdentity])],
  controllers: [ShopController, ShopAuditController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
