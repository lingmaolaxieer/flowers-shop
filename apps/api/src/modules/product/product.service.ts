import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { ProductUnit, Status } from '@flower/shared';
import {
  Product,
  ProductCategory,
  ProductMedia,
  ProductSku,
} from '../../database/entities';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ImportProductsDto } from './dto/import-products.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductMediaVo, ProductPublicVo } from './vo/product-public.vo';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductSku) private readonly skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductMedia) private readonly mediaRepo: Repository<ProductMedia>,
    @InjectRepository(ProductCategory) private readonly categoryRepo: Repository<ProductCategory>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== 顾客端（白名单，绝不含批发价） ====================

  /** 顾客端商品列表：仅返回零售价与媒体白名单字段。 */
  async findPublicList(scope: RequestScope, query: QueryProductDto): Promise<ProductPublicVo[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId: scope.tenantId })
      .andWhere('p.status = :status', { status: Status.ENABLED });
    if (scope.supplierId) {
      qb.andWhere('p.supplier_id = :supplierId', { supplierId: scope.supplierId });
    }
    if (query.categoryId) {
      qb.andWhere('p.category_id = :categoryId', { categoryId: query.categoryId });
    }
    if (query.keyword) {
      qb.andWhere('(p.name LIKE :kw OR p.variety LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    const products = await qb.orderBy('p.created_at', 'DESC').getMany();
    return this.toPublicVoList(products, scope);
  }

  /** 顾客端商品详情：同样走白名单，杜绝批发价泄漏。 */
  async findPublicOne(id: string, scope: RequestScope): Promise<ProductPublicVo> {
    const where: FindOptionsWhere<any> = { id, tenantId: scope.tenantId, status: Status.ENABLED };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    const product = await this.productRepo.findOne({ where });
    if (!product) throw new NotFoundException('商品不存在或已下架');
    const [vo] = await this.toPublicVoList([product], scope);
    return vo;
  }

  // ==================== 管理端：商品 ====================

  async adminList(scope: RequestScope): Promise<Array<Product & { skus: ProductSku[] }>> {
    const where: FindOptionsWhere<any> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    const products = await this.productRepo.find({ where, order: { createdAt: 'DESC' } });
    const skus = products.length
      ? await this.skuRepo.find({ where: { productId: In(products.map((p) => p.id)) } })
      : [];
    return products.map((p) => ({
      ...p,
      skus: skus.filter((s) => s.productId === p.id),
    }));
  }

  async findAdminOne(id: string, scope: RequestScope) {
    const product = await this.getAdminProduct(id, scope);
    const skus = await this.skuRepo.find({
      where: { productId: id, tenantId: scope.tenantId },
      order: { createdAt: 'ASC' },
    });
    return { ...product, skus };
  }

  async create(scope: RequestScope, dto: CreateProductDto) {
    const supplierId = this.requireSupplier(scope);
    await this.assertCategory(scope, supplierId, dto.categoryId);

    return this.dataSource.transaction(async (manager) => {
      const product = await manager.save(
        manager.create(Product, {
          tenantId: scope.tenantId,
          supplierId,
          categoryId: dto.categoryId,
          name: dto.name,
          variety: dto.variety,
          grade: dto.grade,
          origin: dto.origin,
          spec: dto.spec,
          color: dto.color,
          bloomPeriod: dto.bloomPeriod,
          isPresale: dto.isPresale ?? false,
          isNew: dto.isNew ?? false,
          status: Status.ENABLED,
        }),
      );
      const sku = await manager.save(
        manager.create(ProductSku, {
          tenantId: scope.tenantId,
          supplierId,
          productId: product.id,
          unit: dto.sku.unit,
          barcode: dto.sku.barcode,
          retailPrice: dto.sku.retailPrice,
          status: Status.ENABLED,
        }),
      );
      return { product, sku };
    });
  }

  async update(id: string, scope: RequestScope, dto: UpdateProductDto) {
    const product = await this.getAdminProduct(id, scope);
    const supplierId = this.requireSupplier(scope);

    const fields: Partial<Product> = {};
    const assign = <K extends keyof Product>(key: K, value: Product[K] | undefined) => {
      if (value !== undefined) fields[key] = value;
    };
    assign('categoryId', dto.categoryId);
    assign('name', dto.name);
    assign('variety', dto.variety);
    assign('grade', dto.grade);
    assign('origin', dto.origin);
    assign('spec', dto.spec);
    assign('color', dto.color);
    assign('bloomPeriod', dto.bloomPeriod);
    assign('isPresale', dto.isPresale);
    assign('isNew', dto.isNew);
    assign('status', dto.status);
    if (dto.categoryId) await this.assertCategory(scope, supplierId, dto.categoryId);

    await this.dataSource.transaction(async (manager) => {
      if (Object.keys(fields).length) {
        await manager.update(Product, { id, tenantId: scope.tenantId }, fields);
      }
      if (dto.unit !== undefined || dto.retailPrice !== undefined) {
        const sku = await manager.findOne(ProductSku, {
          where: { productId: id, tenantId: scope.tenantId },
          order: { createdAt: 'ASC' },
        });
        if (sku) {
          const skuFields: Partial<ProductSku> = {};
          if (dto.unit !== undefined) skuFields.unit = dto.unit;
          if (dto.retailPrice !== undefined) skuFields.retailPrice = dto.retailPrice;
          await manager.update(ProductSku, { id: sku.id }, skuFields);
        }
      }
    });
    return { id, updated: true };
  }

  async remove(id: string, scope: RequestScope) {
    await this.getAdminProduct(id, scope);
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ProductMedia, { productId: id, tenantId: scope.tenantId });
      await manager.delete(ProductSku, { productId: id, tenantId: scope.tenantId });
      await manager.delete(Product, { id, tenantId: scope.tenantId });
    });
    return { id, deleted: true };
  }

  async addMedia(id: string, scope: RequestScope, dto: AddMediaDto) {
    const product = await this.getAdminProduct(id, scope);
    const media = await this.mediaRepo.save(
      this.mediaRepo.create({
        tenantId: product.tenantId,
        supplierId: product.supplierId,
        productId: product.id,
        url: dto.url,
        type: dto.type ?? 'image',
        sort: dto.sort ?? 0,
      }),
    );
    return media;
  }

  /** 批量导入：items 数组批量建商品 + SKU，单事务保证一致性。 */
  async importProducts(scope: RequestScope, dto: ImportProductsDto) {
    const supplierId = this.requireSupplier(scope);
    const result = await this.dataSource.transaction(async (manager) => {
      let created = 0;
      for (const item of dto.items) {
        await this.assertCategory(scope, supplierId, item.categoryId);
        const product = await manager.save(
          manager.create(Product, {
            tenantId: scope.tenantId,
            supplierId,
            categoryId: item.categoryId,
            name: item.name,
            variety: item.variety,
            grade: item.grade,
            origin: item.origin,
            spec: item.spec,
            color: item.color,
            bloomPeriod: item.bloomPeriod,
            isPresale: item.isPresale ?? false,
            isNew: item.isNew ?? false,
            status: Status.ENABLED,
          }),
        );
        for (const sku of item.skus) {
          await manager.save(
            manager.create(ProductSku, {
              tenantId: scope.tenantId,
              supplierId,
              productId: product.id,
              unit: sku.unit,
              barcode: sku.barcode,
              retailPrice: sku.retailPrice,
              status: Status.ENABLED,
            }),
          );
        }
        created += 1;
      }
      return created;
    });
    return { created: result };
  }

  // ==================== 管理端：类目 ====================

  async listCategories(scope: RequestScope) {
    const where: FindOptionsWhere<any> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    return this.categoryRepo.find({ where, order: { sort: 'ASC', createdAt: 'ASC' } });
  }

  async createCategory(scope: RequestScope, dto: CreateCategoryDto) {
    const supplierId = this.requireSupplier(scope);
    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({
        where: { id: dto.parentId, tenantId: scope.tenantId, supplierId },
      });
      if (!parent) throw new BadRequestException('父类目不存在');
    }
    return this.categoryRepo.save(
      this.categoryRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        name: dto.name,
        parentId: dto.parentId,
        sort: dto.sort ?? 0,
        status: Status.ENABLED,
      }),
    );
  }

  // ==================== 内部辅助 ====================

  private requireSupplier(scope: RequestScope): string {
    if (!scope.supplierId) throw new BadRequestException('当前身份未关联批发商，无法操作商品');
    return scope.supplierId;
  }

  private async assertCategory(scope: RequestScope, supplierId: string, categoryId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, tenantId: scope.tenantId, supplierId },
    });
    if (!category) throw new BadRequestException('类目不存在或不属于当前批发商');
  }

  private async getAdminProduct(id: string, scope: RequestScope): Promise<Product> {
    const where: FindOptionsWhere<any> = { id, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    const product = await this.productRepo.findOne({ where });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  /** 显式白名单映射：只挑选顾客端允许暴露的字段。 */
  private async toPublicVoList(products: Product[], scope: RequestScope): Promise<ProductPublicVo[]> {
    if (!products.length) return [];
    const ids = products.map((p) => p.id);
    const skuWhere: FindOptionsWhere<any> = { productId: In(ids), status: Status.ENABLED };
    if (scope.supplierId) skuWhere.supplierId = scope.supplierId;
    const skus = await this.skuRepo.find({ where: skuWhere, order: { createdAt: 'ASC' } });
    const mediaWhere: FindOptionsWhere<any> = { productId: In(ids) };
    if (scope.supplierId) mediaWhere.supplierId = scope.supplierId;
    const media = await this.mediaRepo.find({ where: mediaWhere, order: { sort: 'ASC' } });

    const skuMap = new Map<string, ProductSku>();
    for (const sku of skus) if (!skuMap.has(sku.productId)) skuMap.set(sku.productId, sku);

    return products.map((p) => {
      const sku = skuMap.get(p.id);
      const productMedia: ProductMediaVo[] = media
        .filter((m) => m.productId === p.id)
        .map((m) => ({ url: m.url, type: m.type, sort: m.sort }));
      return {
        id: p.id,
        name: p.name,
        variety: p.variety,
        grade: p.grade,
        unit: sku?.unit ?? ProductUnit.STEM,
        retailPrice: sku?.retailPrice ?? 0,
        media: productMedia,
      };
    });
  }
}
