import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { PermCode, Status } from '@flower/shared';
import { Permission, Role, RolePermission } from '../../database/entities';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rpRepo: Repository<RolePermission>,
  ) {}

  /** 角色列表：平台预置角色 + 当前租户自定义角色 */
  async list(scope: RequestScope) {
    const roles = await this.roleRepo.find({
      where: [{ tenantId: IsNull() }, { tenantId: scope.tenantId }],
      order: { createdAt: 'ASC' },
    });
    return roles.map((r) => ({
      id: r.id,
      roleCode: r.roleCode,
      name: r.name,
      scope: r.scope,
      tenantId: r.tenantId ?? null,
      preset: r.tenantId == null,
      status: r.status,
    }));
  }

  /** 权限点字典（全局） */
  async listPermissions() {
    return this.permRepo.find({ order: { module: 'ASC', action: 'ASC' } });
  }

  /** 创建租户自定义角色 */
  async create(dto: CreateRoleDto, scope: RequestScope) {
    const exists = await this.roleRepo.findOne({
      where: { roleCode: dto.roleCode, tenantId: scope.tenantId },
    });
    if (exists) throw new BadRequestException('角色编码已存在');

    const role = await this.roleRepo.save(
      this.roleRepo.create({
        tenantId: scope.tenantId,
        roleCode: dto.roleCode,
        name: dto.name,
        scope: dto.scope,
        status: Status.ENABLED,
      }),
    );
    return { id: role.id, roleCode: role.roleCode };
  }

  /** 为自定义角色分配权限；预置角色不可修改 */
  async assignPermissions(roleId: string, permCodes: PermCode[], scope: RequestScope) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, tenantId: scope.tenantId },
    });
    if (!role) throw new NotFoundException('角色不存在或无权修改');
    if (!role.tenantId) throw new ForbiddenException('平台预置角色不允许修改权限');

    const uniqueCodes = [...new Set(permCodes)];
    const perms = await this.permRepo.find({ where: { permCode: In(uniqueCodes) } });
    if (perms.length !== uniqueCodes.length) throw new BadRequestException('包含无效权限码');

    await this.rpRepo.delete({ roleId });
    for (const perm of perms) {
      await this.rpRepo.save(this.rpRepo.create({ roleId, permId: perm.id }));
    }
    return { roleId, count: perms.length };
  }
}
