import { request } from '../../services/request';
import { formatFen } from '../../utils/format';
import { CartItem, getCart, removeFromCart, setCartQty, clearCart } from '../../utils/cart';

interface ShopVO {
  id: string;
  name: string;
}

interface CartItemVM extends CartItem {
  retailPriceText: string;
  subtotalText: string;
}

interface QuoteResult {
  /** 配送费，单位：分 */
  fee: number;
  deliveryFee?: number;
}

interface CreateOrderResult {
  id: string;
}

Page({
  data: {
    items: [] as CartItemVM[],
    shops: [] as ShopVO[],
    shopNames: [] as string[],
    shopIndex: -1,
    shopIdInput: '',
    address: '',
    remark: '',
    deliveryFee: 0,
    deliveryFeeText: '0.00',
    totalText: '0.00',
    quoting: false,
    submitting: false,
  },

  onLoad() {
    this.refreshCart();
    void this.loadShops();
  },

  goProducts() {
    wx.navigateTo({ url: '/pages/products/index' });
  },

  onShow() {
    this.refreshCart();
  },

  refreshCart() {
    const items: CartItemVM[] = getCart().map((i) => ({
      ...i,
      retailPriceText: formatFen(i.retailPrice),
      subtotalText: formatFen(i.retailPrice * i.qty),
    }));
    this.setData({ items }, () => this.calcTotal());
  },

  async loadShops() {
    try {
      const shops = await request<ShopVO[]>('/shops');
      this.setData({
        shops,
        shopNames: (shops || []).map((s) => `${s.name}（${s.id}）`),
      });
    } catch {
      wx.showToast({ title: '未获取到花店列表，请手动输入 shopId', icon: 'none' });
    }
  },

  onShopChange(e: any) {
    const index = Number(e.detail.value);
    const shop = this.data.shops[index];
    this.setData({ shopIndex: index, shopIdInput: shop?.id || '' });
  },

  onShopIdInput(e: any) {
    this.setData({ shopIdInput: e.detail.value });
  },

  onAddressInput(e: any) {
    this.setData({ address: e.detail.value });
  },

  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  changeQty(e: any) {
    const skuId = e.currentTarget.dataset.sku as string;
    const delta = Number(e.currentTarget.dataset.delta);
    const item = getCart().find((i) => i.skuId === skuId);
    if (!item) return;
    setCartQty(skuId, item.qty + delta);
    this.refreshCart();
  },

  removeItem(e: any) {
    const skuId = e.currentTarget.dataset.sku as string;
    removeFromCart(skuId);
    this.refreshCart();
  },

  calcTotal() {
    const goods = this.data.items.reduce((sum, i) => sum + i.retailPrice * i.qty, 0);
    this.setData({ totalText: formatFen(goods + this.data.deliveryFee) });
  },

  async onQuote() {
    const shopId = this.data.shopIdInput.trim();
    if (!shopId) {
      wx.showToast({ title: '请先选择或输入花店', icon: 'none' });
      return;
    }
    this.setData({ quoting: true });
    try {
      const res = await request<QuoteResult>('/delivery/quote', {
        method: 'POST',
        data: {
          shopId,
          address: this.data.address,
          items: getCart().map((i) => ({ skuId: i.skuId, qty: i.qty })),
        },
      });
      const fee = Number(res?.deliveryFee ?? res?.fee ?? 0);
      this.setData({ deliveryFee: fee, deliveryFeeText: formatFen(fee) }, () => this.calcTotal());
      wx.showToast({ title: '配送费已试算', icon: 'success' });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '配送费试算失败', icon: 'none' });
    } finally {
      this.setData({ quoting: false });
    }
  },

  async onSubmit() {
    const items = getCart();
    const shopId = this.data.shopIdInput.trim();
    if (items.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    if (!shopId) {
      wx.showToast({ title: '请先选择或输入花店', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await request<CreateOrderResult>('/orders', {
        method: 'POST',
        data: {
          shopId,
          address: this.data.address,
          remark: this.data.remark,
          deliveryFee: this.data.deliveryFee,
          items: items.map((i) => ({
            skuId: i.skuId,
            qty: i.qty,
            retailPrice: i.retailPrice,
          })),
        },
      });
      clearCart();
      wx.showToast({ title: '下单成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateTo({ url: `/pages/order-detail/index?id=${res.id}` });
      }, 600);
    } catch (err: any) {
      wx.showToast({ title: err?.message || '下单失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
