import { request } from '../../services/request';
import { formatFen } from '../../utils/format';

interface ProductVO {
  id: string;
  name: string;
  variety?: string;
  grade?: string;
  origin?: string;
  spec?: string;
  unit?: string;
  /** 顾客零售价，单位：分 */
  retailPrice: number;
  image?: string;
}

interface ProductCardVM extends ProductVO {
  retailPriceText: string;
}

Page({
  data: {
    products: [] as ProductCardVM[],
    loading: false,
  },

  onLoad() {
    void this.loadProducts();
  },

  onPullDownRefresh() {
    void this.loadProducts().finally(() => wx.stopPullDownRefresh());
  },

  async loadProducts() {
    this.setData({ loading: true });
    try {
      const list = await request<ProductVO[]>('/products');
      const products: ProductCardVM[] = (list || []).map((p) => ({
        ...p,
        retailPriceText: formatFen(p.retailPrice),
      }));
      this.setData({ products });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '商品加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e: any) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/product-detail/index?id=${id}` });
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/index' });
  },
});
