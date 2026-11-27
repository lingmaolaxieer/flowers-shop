import { ProductUnit } from '@flower/shared';

/** 顾客端商品 VO：白名单，绝不包含批发价/成本/抽成字段。 */
export class ProductMediaVo {
  url: string;
  type: 'image' | 'video';
  sort: number;
}

export class ProductPublicVo {
  id: string;
  name: string;
  variety?: string;
  grade?: string;
  unit: ProductUnit;
  /** 顾客零售价，单位：分 */
  retailPrice: number;
  media: ProductMediaVo[];
}
