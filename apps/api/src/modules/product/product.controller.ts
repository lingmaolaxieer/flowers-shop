import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { ProductService } from './product.service';
import { AddMediaDto } from './dto/add-media.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ImportProductsDto } from './dto/import-products.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** 顾客端：只暴露零售价白名单，绝不返回批发价/成本。 */
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(@CurrentScope() scope: RequestScope, @Query() query: QueryProductDto) {
    return this.productService.findPublicList(scope, query);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.productService.findPublicOne(id, scope);
  }
}

/** 管理端：商品 CRUD、媒体、批量导入。 */
@Controller('admin/products')
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @RequiresPerm(PermCode.PRODUCT_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.productService.adminList(scope);
  }

  @Post('import')
  @RequiresPerm(PermCode.PRODUCT_WRITE)
  import(@CurrentScope() scope: RequestScope, @Body() dto: ImportProductsDto) {
    return this.productService.importProducts(scope, dto);
  }

  @Get(':id')
  @RequiresPerm(PermCode.PRODUCT_READ)
  detail(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.productService.findAdminOne(id, scope);
  }

  @Post()
  @RequiresPerm(PermCode.PRODUCT_WRITE)
  create(@CurrentScope() scope: RequestScope, @Body() dto: CreateProductDto) {
    return this.productService.create(scope, dto);
  }

  @Put(':id')
  @RequiresPerm(PermCode.PRODUCT_WRITE)
  update(
    @Param('id') id: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, scope, dto);
  }

  @Delete(':id')
  @RequiresPerm(PermCode.PRODUCT_WRITE)
  remove(@Param('id') id: string, @CurrentScope() scope: RequestScope) {
    return this.productService.remove(id, scope);
  }

  @Post(':id/media')
  @RequiresPerm(PermCode.PRODUCT_WRITE)
  addMedia(
    @Param('id') id: string,
    @CurrentScope() scope: RequestScope,
    @Body() dto: AddMediaDto,
  ) {
    return this.productService.addMedia(id, scope, dto);
  }
}

/** 管理端：商品类目。 */
@Controller('admin/product-categories')
export class AdminCategoryController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @RequiresPerm(PermCode.PRODUCT_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.productService.listCategories(scope);
  }

  @Post()
  @RequiresPerm(PermCode.PRODUCT_WRITE)
  create(@CurrentScope() scope: RequestScope, @Body() dto: CreateCategoryDto) {
    return this.productService.createCategory(scope, dto);
  }
}
