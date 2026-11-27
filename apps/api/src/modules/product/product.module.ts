import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  ProductCategory,
  ProductMedia,
  ProductSku,
} from '../../database/entities';
import {
  AdminCategoryController,
  AdminProductController,
  ProductController,
} from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductSku, ProductMedia, ProductCategory]),
  ],
  controllers: [ProductController, AdminProductController, AdminCategoryController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
