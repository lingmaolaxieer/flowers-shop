import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status, TenantType } from '@flower/shared';
import { Supplier, Tenant } from '../../database/entities';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier) private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {}

  /** 列表：平台运营看全部，批发商身份只看自己 */
  async list(scope: RequestScope) {
    const where: Record<string, unknown> = {};
    if (scope.supplierId) where.id = scope.supplierId;
    const suppliers = await this.supplierRepo.find({ where, order: { createdAt: 'DESC' } });
    return suppliers.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      contactName: s.contactName ?? null,
      contactPhone: s.contactPhone ?? null,
      status: s.status,
    }));
  }

  /** 平台运营创建批发商：同时创建独立租户，天然多租户隔离 */
  async create(dto: CreateSupplierDto) {
    const tenant = await this.tenantRepo.save(
      this.tenantRepo.create({
        name: `${dto.name}-租户`,
        type: TenantType.SUPPLIER,
        status: Status.ENABLED,
      }),
    );
    const supplier = await this.supplierRepo.save(
      this.supplierRepo.create({
        tenantId: tenant.id,
        name: dto.name,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        status: Status.ENABLED,
      }),
    );
    return { id: supplier.id, tenantId: tenant.id, name: supplier.name };
  }

  /** 启用/停用（批发商身份只能操作自己） */
  async toggleStatus(id: string, status: number, scope: RequestScope) {
    const where: Record<string, unknown> = { id };
    if (scope.supplierId) where.id = scope.supplierId;
    const supplier = await this.supplierRepo.findOne({ where });
    if (!supplier) throw new NotFoundException('批发商不存在或无权操作');
    await this.supplierRepo.update({ id }, { status });
    return { id, status };
  }
}
