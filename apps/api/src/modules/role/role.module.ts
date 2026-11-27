import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission, Role, RolePermission } from '../../database/entities';
import { PermissionController, RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission])],
  controllers: [RoleController, PermissionController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
