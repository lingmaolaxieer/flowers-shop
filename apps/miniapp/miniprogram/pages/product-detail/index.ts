import { request } from '../../services/request';
import { formatFen } from '../../utils/format';
import { addToCart } from '../../utils/cart';

interface MediaVO {
  url: string;
  type: 'image' | 'video';
}

interface SkuVO {
  id: string;
  unit: string;
  spec?: string;
  /** 顾客零售价，单位：分 */
  retailPrice: number;
}

interface ProductDetailVO {
  id: string;
  name: string;
  variety?: string;
  grade?: string;
  origin?: string;
  spec?: string;
  description?: string;
  media?: MediaVO[];
  skus?: SkuVO[];
}

interface SkuVM extends SkuVO {
  retailPriceText: string;
  specText: string;
}

Page({
  data: {
    productId: '',
    name: '',
    variety: '',
    grade: '',
    origin: '',
    spec: '',
    description: '',
    media: [] as MediaVO[],
    skus: [] as SkuVM[],
    selectedSkuIndex: 0,
    currentPriceText: '0.00',
    currentUnit: '',
    qty: 1,
    loading: false,
  },

  onLoad(options: { id?: string }) {
    const productId = options.id || '';
    this.setData({ productId });
    if (productId) void this.loadDetail(productId);
    else wx.showToast({ title: '缺少商品参数', icon: 'none' });
  },

  async loadDetail(id: string) {
    this.setData({ loading: true });
    try {
      const detail = await request<ProductDetailVO>(`/products/${id}`);
      const skus: SkuVM[] = (detail.skus || []).map((s) => ({
        ...s,
        retailPriceText: formatFen(s.retailPrice),
        specText: s.spec || detail.spec || '默认规格',
      }));
      const first = skus[0];
      this.setData({
        name: detail.name || '',
        variety: detail.variety || '',
        grade: detail.grade || '',
        origin: detail.origin || '',
        spec: detail.spec || '',
        description: detail.description || '',
        media: detail.media || [],
        skus,
        currentPriceText: first?.retailPriceText || '0.00',
        currentUnit: first?.unit || '',
      });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '详情加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSelectSku(e: any) {
    const index = Number(e.currentTarget.dataset.index);
    const sku = this.data.skus[index];
    if (!sku) return;
    this.setData({
      selectedSkuIndex: index,
      currentPriceText: sku.retailPriceText,
      currentUnit: sku.unit,
    });
  },

  onQtyInput(e: any) {
    const qty = Math.max(1, Math.floor(Number(e.detail.value) || 1));
    this.setData({ qty });
  },

  changeQty(e: any) {
    const delta = Number(e.currentTarget.dataset.delta);
    const qty = Math.max(1, this.data.qty + delta);
    this.setData({ qty });
  },

  onAddToCart() {
    const { skus, selectedSkuIndex, qty, productId, name, media } = this.data;
    const sku = skus[selectedSkuIndex];
    if (!sku) {
      wx.showToast({ title: '暂无可售规格', icon: 'none' });
      return;
    }
    addToCart({
      skuId: sku.id,
      productId,
      name,
      spec: sku.spec || this.data.spec || '',
      unit: sku.unit,
      retailPrice: sku.retailPrice,
      qty,
      image: media.find((m) => m.type === 'image')?.url || '',
    });
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/index' });
  },
});
