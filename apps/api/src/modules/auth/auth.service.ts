import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  AuditStatus,
  PermCode,
  RoleCode,
  Status,
  TenantType,
} from '@flower/shared';
import {
  Permission,
  Role,
  RolePermission,
  Tenant,
  User,
  UserIdentity,
} from '../../database/entities';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { WechatService } from '../integration/wechat/wechat.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { BindPhoneDto } from './dto/bind-phone.dto';

const maskPhone = (phone: string): string => phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');

@Injectable()
export class AuthService {
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly wechat: WechatService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserIdentity) private readonly identityRepo: Repository<UserIdentity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
  ) {
    this.accessTtl = this.config.get<string>('app.jwt.accessTtl') ?? '7d';
    this.refreshTtl = this.config.get<string>('app.jwt.refreshTtl') ?? '30d';
  }

  /** 微信登录：首次登录自动创建用户与 CUSTOMER 身份 */
  async wxLogin(dto: WxLoginDto) {
    const { openid, unionid } = await this.wechat.getOpenidByCode(dto.code);

    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({ openid, unionid, status: Status.ENABLED }),
      );
      const platform = await this.tenantRepo.findOne({ where: { type: TenantType.PLATFORM } });
      await this.identityRepo.save(
        this.identityRepo.create({
          userId: user.id,
          tenantId: platform?.id ?? '1',
          roleCode: RoleCode.CUSTOMER,
          auditStatus: AuditStatus.APPROVED,
          status: Status.ENABLED,
          lastUsedAt: new Date(),
        }),
      );
    }

    if (user.status !== Status.ENABLED) throw new ForbiddenException('账号已被禁用');

    const identities = await this.listIdentityEntities(user.id);
    if (identities.length === 0) throw new BadRequestException('账号未分配任何有效身份');

    // 最近使用的身份优先（NULL 在 DESC 中排最后）
    const current = identities[0];
    await this.touchIdentity(current.id);
    return this.buildAuthResult(user, current, identities);
  }

  /** 我的身份列表 */
  async getIdentities(userId: string) {
    const identities = await this.listIdentityEntities(userId);
    return identities.map((i) => this.toIdentityVO(i));
  }

  /** 多身份切换：校验归属/状态/审核后重新签发 JWT */
  async switchIdentity(userId: string, identityId: string) {
    const identity = await this.identityRepo.findOne({
      where: { id: identityId, userId },
    });
    if (!identity) throw new NotFoundException('身份不存在');
    if (identity.status !== Status.ENABLED) throw new ForbiddenException('该身份已停用');
    if (identity.auditStatus !== AuditStatus.APPROVED) {
      throw new ForbiddenException('该身份尚未审核通过');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.status !== Status.ENABLED) throw new ForbiddenException('账号状态异常');

    await this.touchIdentity(identity.id);
    const perms = await this.getPermsByRoleCode(identity.roleCode);
    const payload = this.buildPayload(user.id, identity, perms);
    const token = await this.jwtService.signAsync(payload, { expiresIn: this.accessTtl });

    return { token, currentIdentity: this.toIdentityVO(identity) };
  }

  /** 绑定手机号（wx.getPhoneNumber 的 code） */
  async bindPhone(userId: string, dto: BindPhoneDto) {
    const phone = await this.wechat.resolvePhoneByCode(dto.code);
    await this.userRepo.update({ id: userId }, { phone });
    return { phone: maskPhone(phone) };
  }

  /** 刷新 access token（refresh token 本身即凭证，接口标记 @Public） */
  async refreshToken(refreshToken: string) {
    let decoded: { sub?: string; identityId?: string };
    try {
      decoded = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }
    if (!decoded.sub || !decoded.identityId) {
      throw new UnauthorizedException('refresh token 载荷不完整');
    }

    const identity = await this.identityRepo.findOne({
      where: { id: decoded.identityId, userId: decoded.sub },
    });
    if (
      !identity ||
      identity.status !== Status.ENABLED ||
      identity.auditStatus !== AuditStatus.APPROVED
    ) {
      throw new UnauthorizedException('身份已失效，请重新登录');
    }
    const user = await this.userRepo.findOne({ where: { id: decoded.sub } });
    if (!user || user.status !== Status.ENABLED) throw new UnauthorizedException('账号已禁用');

    return this.buildAuthResult(user, identity, await this.listIdentityEntities(user.id));
  }

  /** 当前用户档案 */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return {
      id: user.id,
      phone: user.phone ? maskPhone(user.phone) : null,
      status: user.status,
    };
  }

  /**
   * Web 管理端内网测试登录：凭 openid 换取 token。
   * 【需人工/二期】正式上线应替换为「小程序扫码授权登录」，此接口仅在内网/开发环境启用。
   */
  async webLogin(openid: string) {
    const user = await this.userRepo.findOne({ where: { openid } });
    if (!user || user.status !== Status.ENABLED) {
      throw new UnauthorizedException('账号不存在或已禁用');
    }
    const identities = await this.listIdentityEntities(user.id);
    if (identities.length === 0) throw new ForbiddenException('账号未分配有效身份');

    const current = identities[0];
    await this.touchIdentity(current.id);
    return this.buildAuthResult(user, current, identities);
  }

  // ---------- 内部辅助 ----------

  private listIdentityEntities(userId: string): Promise<UserIdentity[]> {
    return this.identityRepo.find({
      where: { userId, status: Status.ENABLED, auditStatus: AuditStatus.APPROVED },
      order: { lastUsedAt: 'DESC', createdAt: 'ASC' },
    });
  }

  private async touchIdentity(identityId: string): Promise<void> {
    await this.identityRepo.update({ id: identityId }, { lastUsedAt: new Date() });
  }

  private toIdentityVO(identity: UserIdentity) {
    return {
      id: identity.id,
      roleCode: identity.roleCode,
      tenantId: identity.tenantId,
      supplierId: identity.supplierId ?? null,
      shopId: identity.shopId ?? null,
    };
  }

  private buildPayload(
    userId: string,
    identity: UserIdentity,
    perms: PermCode[],
  ): JwtPayload {
    return {
      sub: userId,
      identityId: identity.id,
      roleCode: identity.roleCode,
      tenantId: identity.tenantId,
      supplierId: identity.supplierId,
      shopId: identity.shopId,
      perms,
    };
  }

  private async buildAuthResult(user: User, current: UserIdentity, identities: UserIdentity[]) {
    const perms = await this.getPermsByRoleCode(current.roleCode);
    const payload = this.buildPayload(user.id, current, perms);
    const token = await this.jwtService.signAsync(payload, { expiresIn: this.accessTtl });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, identityId: current.id },
      { expiresIn: this.refreshTtl },
    );
    return {
      token,
      refreshToken,
      currentIdentity: this.toIdentityVO(current),
      identities: identities.map((i) => this.toIdentityVO(i)),
    };
  }

  private async getPermsByRoleCode(roleCode: RoleCode): Promise<PermCode[]> {
    const role = await this.roleRepo.findOne({
      where: { roleCode, tenantId: IsNull() },
    });
    if (!role) return [];
    const bindings = await this.rpRepo.find({ where: { roleId: role.id } });
    if (bindings.length === 0) return [];
    const perms = await this.permRepo.find({
      where: { id: In(bindings.map((b) => b.permId)) },
    });
    return perms.map((p) => p.permCode);
  }
}
