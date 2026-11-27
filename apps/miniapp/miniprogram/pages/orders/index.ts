import { ORDER_STATUS_NAMES } from '../../constants';
import { request } from '../../services/request';
import { formatFen } from '../../utils/format';

interface OrderVO {
  id: string;
  status: string;
  shopName?: string;
  /** 订单金额，单位：分 */
  totalAmount?: number;
  createdAt?: string;
}

interface OrderVM extends OrderVO {
  statusName: string;
  totalText: string;
}

interface OrderGroupVM {
  status: string;
  statusName: string;
  orders: OrderVM[];
}

Page({
  data: {
    groups: [] as OrderGroupVM[],
    loading: false,
  },

  onLoad() {
    void this.loadOrders();
  },

  onPullDownRefresh() {
    void this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  onShow() {
    // 从详情返回时刷新状态
    if (this.data.groups.length > 0) void this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const list = await request<OrderVO[]>('/orders');
      const map = new Map<string, OrderVM[]>();
      (list || []).forEach((o) => {
        const vm: OrderVM = {
          ...o,
          statusName: ORDER_STATUS_NAMES[o.status] || o.status,
          totalText: formatFen(o.totalAmount),
        };
        const bucket = map.get(o.status) || [];
        bucket.push(vm);
        map.set(o.status, bucket);
      });
      const groups: OrderGroupVM[] = Array.from(map.entries()).map(([status, orders]) => ({
        status,
        statusName: orders[0].statusName,
        orders,
      }));
      this.setData({ groups });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '订单加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e: any) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/order-detail/index?id=${id}` });
  },

  goProducts() {
    wx.navigateTo({ url: '/pages/products/index' });
  },
});
