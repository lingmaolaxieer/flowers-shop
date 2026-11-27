import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermsDto } from './dto/assign-perms.dto';

@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequiresPerm(PermCode.ROLE_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.roleService.list(scope);
  }

  @Post()
  @RequiresPerm(PermCode.ROLE_WRITE)
  create(@Body() dto: CreateRoleDto, @CurrentScope() scope: RequestScope) {
    return this.roleService.create(dto, scope);
  }

  @Post(':id/perms')
  @RequiresPerm(PermCode.ROLE_WRITE)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignPermsDto,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.roleService.assignPermissions(id, dto.permCodes, scope);
  }
}

@Controller('admin/permissions')
export class PermissionController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequiresPerm(PermCode.ROLE_READ)
  list() {
    return this.roleService.listPermissions();
  }
}
