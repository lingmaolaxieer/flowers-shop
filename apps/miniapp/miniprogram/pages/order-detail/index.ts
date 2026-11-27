import { ORDER_STATUS_NAMES } from '../../constants';
import { request } from '../../services/request';
import { formatFen } from '../../utils/format';

interface OrderItemVO {
  skuId: string;
  name?: string;
  productName?: string;
  qty: number;
  /** 顾客零售价，单位：分 */
  retailPrice: number;
}

interface DeliveryVO {
  company?: string;
  trackingNo?: string;
  driverName?: string;
  driverPhone?: string;
}

interface OrderDetailVO {
  id: string;
  status: string;
  shopName?: string;
  address?: string;
  remark?: string;
  /** 订单金额，单位：分 */
  totalAmount?: number;
  deliveryFee?: number;
  createdAt?: string;
  items?: OrderItemVO[];
  delivery?: DeliveryVO;
}

interface OrderItemVM extends OrderItemVO {
  itemName: string;
  retailPriceText: string;
  subtotalText: string;
}

interface PrepayResult {
  mock?: boolean;
  timeStamp?: string;
  nonceStr?: string;
  package?: string;
  signType?: string;
  paySign?: string;
}

Page({
  data: {
    orderId: '',
    statusName: '',
    status: '',
    shopName: '',
    address: '',
    remark: '',
    totalText: '0.00',
    deliveryFeeText: '0.00',
    createdAt: '',
    items: [] as OrderItemVM[],
    delivery: null as DeliveryVO | null,
    message: '',
    paying: false,
    messaging: false,
  },

  onLoad(options: { id?: string }) {
    const orderId = options.id || '';
    this.setData({ orderId });
    if (orderId) void this.loadDetail(orderId);
    else wx.showToast({ title: '缺少订单参数', icon: 'none' });
  },

  async loadDetail(id: string) {
    try {
      const order = await request<OrderDetailVO>(`/orders/${id}`);
      const items: OrderItemVM[] = (order.items || []).map((i) => ({
        ...i,
        itemName: i.name || i.productName || i.skuId,
        retailPriceText: formatFen(i.retailPrice),
        subtotalText: formatFen(i.retailPrice * i.qty),
      }));
      this.setData({
        status: order.status,
        statusName: ORDER_STATUS_NAMES[order.status] || order.status,
        shopName: order.shopName || '',
        address: order.address || '',
        remark: order.remark || '',
        totalText: formatFen(order.totalAmount),
        deliveryFeeText: formatFen(order.deliveryFee),
        createdAt: order.createdAt || '',
        items,
        delivery: order.delivery || null,
      });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '订单详情加载失败', icon: 'none' });
    }
  },

  onMessageInput(e: any) {
    this.setData({ message: e.detail.value });
  },

  async sendMessage() {
    const content = this.data.message.trim();
    if (!content) {
      wx.showToast({ title: '请输入留言内容', icon: 'none' });
      return;
    }
    this.setData({ messaging: true });
    try {
      await request(`/orders/${this.data.orderId}/messages`, {
        method: 'POST',
        data: { content },
      });
      this.setData({ message: '' });
      wx.showToast({ title: '留言已发送', icon: 'success' });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '留言失败', icon: 'none' });
    } finally {
      this.setData({ messaging: false });
    }
  },

  async onPay() {
    this.setData({ paying: true });
    try {
      const params = await request<PrepayResult>('/payments/prepay', {
        method: 'POST',
        data: { orderId: this.data.orderId },
      });
      // mock 环境（或返回参数不完整）不发起真实收银台，仅提示
      if (params?.mock || !params?.package || !params?.paySign) {
        wx.showToast({ title: '模拟环境：支付流程已跳过', icon: 'none' });
        return;
      }
      await new Promise<void>((resolve, reject) => {
        wx.requestPayment({
          timeStamp: params.timeStamp || '',
          nonceStr: params.nonceStr || '',
          package: params.package || '',
          signType: (params.signType || 'RSA') as 'RSA',
          paySign: params.paySign || '',
          success: () => resolve(),
          fail: (err) => reject(new Error(err.errMsg || '支付取消')),
        });
      });
      wx.showToast({ title: '支付成功', icon: 'success' });
      void this.loadDetail(this.data.orderId);
    } catch (err: any) {
      wx.showToast({ title: err?.message || '支付失败', icon: 'none' });
    } finally {
      this.setData({ paying: false });
    }
  },
});
