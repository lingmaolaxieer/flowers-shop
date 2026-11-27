import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AuditStatus, Status } from '@flower/shared';
import {
  Role,
  User,
  UserIdentity,
  UserRoleBinding,
} from '../../database/entities';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserRoleBinding) private readonly bindingRepo: Repository<UserRoleBinding>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserIdentity) private readonly identityRepo: Repository<UserIdentity>,
  ) {}

  /** 子账号列表（严格按租户/供应商/花店隔离） */
  async listStaff(scope: RequestScope) {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;

    const bindings = await this.bindingRepo.find({ where, order: { createdAt: 'DESC' } });
    if (bindings.length === 0) return [];

    const users = await this.userRepo.find({ where: { id: In(bindings.map((b) => b.userId)) } });
    const roles = await this.roleRepo.find({ where: { id: In(bindings.map((b) => b.roleId)) } });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    return bindings.map((b) => ({
      id: b.id,
      userId: b.userId,
      openid: userMap.get(b.userId)?.openid ?? '',
      phone: userMap.get(b.userId)?.phone ?? null,
      roleCode: roleMap.get(b.roleId)?.roleCode ?? '',
      roleName: roleMap.get(b.roleId)?.name ?? '',
      supplierId: b.supplierId ?? null,
      shopId: b.shopId ?? null,
      status: b.status,
    }));
  }

  /** 创建子账号：绑定角色并同步生成可切换身份 */
  async createStaff(dto: CreateStaffDto, scope: RequestScope) {
    const role = await this.roleRepo.findOne({
      where: [
        { roleCode: dto.roleCode, tenantId: IsNull() },
        { roleCode: dto.roleCode, tenantId: scope.tenantId },
      ],
    });
    if (!role) throw new BadRequestException('角色不存在');

    let user = await this.userRepo.findOne({ where: { openid: dto.openid } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({ openid: dto.openid, status: Status.ENABLED }),
      );
    }

    const binding = await this.bindingRepo.save(
      this.bindingRepo.create({
        userId: user.id,
        roleId: role.id,
        tenantId: scope.tenantId,
        supplierId: dto.supplierId ?? scope.supplierId,
        shopId: dto.shopId ?? scope.shopId,
        status: Status.ENABLED,
      }),
    );

    const identityExists = await this.identityRepo.findOne({
      where: {
        userId: user.id,
        roleCode: role.roleCode as any,
        supplierId: binding.supplierId ?? undefined,
        shopId: binding.shopId ?? undefined,
      },
    });
    if (!identityExists) {
      await this.identityRepo.save(
        this.identityRepo.create({
          userId: user.id,
          tenantId: scope.tenantId,
          supplierId: binding.supplierId,
          shopId: binding.shopId,
          roleCode: role.roleCode as any,
          auditStatus: AuditStatus.APPROVED,
          status: Status.ENABLED,
        }),
      );
    }

    return { bindingId: binding.id, userId: user.id, roleCode: role.roleCode };
  }

  /** 启用/停用子账号（同步停用其身份，切换时会失败） */
  async toggleStatus(id: string, status: number, scope: RequestScope) {
    const where: Record<string, unknown> = { id, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;

    const binding = await this.bindingRepo.findOne({ where });
    if (!binding) throw new NotFoundException('子账号不存在或无权操作');

    await this.bindingRepo.update({ id }, { status });

    const role = await this.roleRepo.findOne({ where: { id: binding.roleId } });
    if (role) {
      await this.identityRepo.update(
        {
          userId: binding.userId,
          roleCode: role.roleCode as any,
          supplierId: binding.supplierId ?? undefined,
          shopId: binding.shopId ?? undefined,
        },
        { status },
      );
    }
    return { id, status };
  }
}
