import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditStatus,
  RoleCode,
  Status,
} from '@flower/shared';
import {
  Shop,
  ShopAudit,
  Supplier,
  Tenant,
  UserIdentity,
} from '../../database/entities';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { ApplyShopDto } from './dto/apply-shop.dto';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop) private readonly shopRepo: Repository<Shop>,
    @InjectRepository(ShopAudit) private readonly auditRepo: Repository<ShopAudit>,
    @InjectRepository(Supplier) private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(UserIdentity) private readonly identityRepo: Repository<UserIdentity>,
  ) {}

  /** 店家提交入驻申请（注册后可浏览，审核通过前不可下单） */
  async apply(userId: string, scope: RequestScope, dto: ApplyShopDto) {
    const existing = await this.shopRepo.findOne({
      where: { ownerUserId: userId, supplierId: dto.supplierId ?? undefined },
    });
    if (existing) throw new BadRequestException('该账号已提交过入驻申请');

    const supplierId = dto.supplierId ?? (await this.getDefaultSupplierId());
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier || supplier.status !== Status.ENABLED) {
      throw new BadRequestException('指定的批发商不存在或已停用');
    }

    const shop = await this.shopRepo.save(
      this.shopRepo.create({
        tenantId: supplier.tenantId,
        supplierId,
        name: dto.name,
        ownerUserId: userId,
        licenseNo: dto.licenseNo,
        contactPhone: dto.contactPhone,
        auditStatus: AuditStatus.PENDING,
        status: Status.ENABLED,
      }),
    );

    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId: shop.tenantId,
        supplierId: shop.supplierId,
        shopId: shop.id,
        licenseNo: dto.licenseNo,
        licenseImage: dto.licenseImage,
        contactPhone: dto.contactPhone,
        status: AuditStatus.PENDING,
      }),
    );

    return { shopId: shop.id, auditStatus: shop.auditStatus };
  }

  /** 我申请的花店 */
  async findMine(userId: string) {
    const shops = await this.shopRepo.find({
      where: { ownerUserId: userId },
      order: { createdAt: 'DESC' },
    });
    return shops.map((s) => this.toVO(s));
  }

  /** 花店详情（严格租户隔离） */
  async findOne(id: string, scope: RequestScope) {
    const shop = await this.shopRepo.findOne({
      where: { id, tenantId: scope.tenantId },
    });
    if (!shop) throw new NotFoundException('花店不存在');
    return this.toVO(shop);
  }

  /** 审核列表 */
  async listAudits(scope: RequestScope, status?: AuditStatus) {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (status) where.status = status;
    if (scope.supplierId) where.supplierId = scope.supplierId;

    const audits = await this.auditRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    const shops = await this.shopRepo.find({ where: { tenantId: scope.tenantId } });
    const shopMap = new Map(shops.map((s) => [s.id, s]));
    return audits.map((a) => ({
      id: a.id,
      shopId: a.shopId,
      shopName: shopMap.get(a.shopId)?.name ?? '',
      licenseNo: a.licenseNo,
      licenseImage: a.licenseImage ?? null,
      contactPhone: a.contactPhone,
      status: a.status,
      auditRemark: a.auditRemark ?? null,
      createdAt: a.createdAt,
    }));
  }

  /** 审核通过：更新审核单与花店，并为店主开通 SHOP_MANAGER 身份 */
  async approve(auditId: string, auditorId: string, scope: RequestScope, remark?: string) {
    const audit = await this.getAuditInScope(auditId, scope);
    if (audit.status !== AuditStatus.PENDING) throw new BadRequestException('该申请已处理');

    await this.auditRepo.update(
      { id: audit.id },
      {
        status: AuditStatus.APPROVED,
        auditorId,
        auditRemark: remark ?? null,
      },
    );
    await this.shopRepo.update(
      { id: audit.shopId, tenantId: scope.tenantId },
      { auditStatus: AuditStatus.APPROVED, auditedBy: auditorId, auditedAt: new Date(), auditRemark: remark ?? null },
    );

    await this.ensureManagerIdentity(audit.shopId);
    return { auditId: audit.id, status: AuditStatus.APPROVED };
  }

  /** 审核驳回 */
  async reject(auditId: string, auditorId: string, scope: RequestScope, remark?: string) {
    const audit = await this.getAuditInScope(auditId, scope);
    if (audit.status !== AuditStatus.PENDING) throw new BadRequestException('该申请已处理');
    if (!remark) throw new BadRequestException('驳回必须填写原因');

    await this.auditRepo.update(
      { id: audit.id },
      { status: AuditStatus.REJECTED, auditorId, auditRemark: remark },
    );
    await this.shopRepo.update(
      { id: audit.shopId, tenantId: scope.tenantId },
      { auditStatus: AuditStatus.REJECTED, auditedBy: auditorId, auditedAt: new Date(), auditRemark: remark },
    );
    return { auditId: audit.id, status: AuditStatus.REJECTED };
  }

  // ---------- 内部辅助 ----------

  private async getAuditInScope(auditId: string, scope: RequestScope): Promise<ShopAudit> {
    const where: Record<string, unknown> = { id: auditId, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    const audit = await this.auditRepo.findOne({ where });
    if (!audit) throw new NotFoundException('审核记录不存在或无权访问');
    return audit;
  }

  private async getDefaultSupplierId(): Promise<string> {
    const supplier = await this.supplierRepo.findOne({
      where: { status: Status.ENABLED },
      order: { createdAt: 'ASC' },
    });
    if (!supplier) throw new BadRequestException('系统尚未配置批发商，请先初始化数据');
    return supplier.id;
  }

  private async ensureManagerIdentity(shopId: string): Promise<void> {
    const shop = await this.shopRepo.findOne({ where: { id: shopId } });
    if (!shop) return;
    const exists = await this.identityRepo.findOne({
      where: {
        userId: shop.ownerUserId,
        shopId,
        roleCode: RoleCode.SHOP_MANAGER,
      },
    });
    if (exists) return;
    await this.identityRepo.save(
      this.identityRepo.create({
        userId: shop.ownerUserId,
        tenantId: shop.tenantId,
        supplierId: shop.supplierId,
        shopId,
        roleCode: RoleCode.SHOP_MANAGER,
        auditStatus: AuditStatus.APPROVED,
        status: Status.ENABLED,
      }),
    );
  }

  private toVO(shop: Shop) {
    return {
      id: shop.id,
      name: shop.name,
      supplierId: shop.supplierId,
      auditStatus: shop.auditStatus,
      licenseNo: shop.licenseNo,
      contactPhone: shop.contactPhone,
      settlementCycle: shop.settlementCycle,
      status: shop.status,
      createdAt: shop.createdAt,
    };
  }
}
