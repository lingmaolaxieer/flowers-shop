import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PriceDailyQuote,
  ShopLevelPrice,
  ShopSpecificPrice,
  TierPrice,
} from '../../database/entities';
import { AdminPriceController, PriceController } from './price.controller';
import { PriceService } from './price.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PriceDailyQuote,
      ShopSpecificPrice,
      ShopLevelPrice,
      TierPrice,
    ]),
  ],
  controllers: [PriceController, AdminPriceController],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
