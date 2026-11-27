import { ORDER_STATUS_NAMES } from '../../constants';
import { request } from '../../services/request';

interface AdminOrderVO {
  id: string;
  status: string;
  shopName?: string;
  address?: string;
  createdAt?: string;
}

interface OrderVM extends AdminOrderVO {
  statusName: string;
}

Page({
  data: {
    orders: [] as OrderVM[],
    selectedId: '',
    statusInput: 'delivering',
    loading: false,
    updating: false,
  },

  onLoad() {
    void this.loadOrders();
  },

  onPullDownRefresh() {
    void this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const list = await request<AdminOrderVO[]>('/admin/orders', {
        data: { status: 'delivering' },
      });
      const orders: OrderVM[] = (list || [])
        .filter((o) => o.status === 'delivering')
        .map((o) => ({ ...o, statusName: ORDER_STATUS_NAMES[o.status] || o.status }));
      this.setData({ orders });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '订单加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSelect(e: any) {
    this.setData({ selectedId: e.currentTarget.dataset.id as string });
  },

  onStatusInput(e: any) {
    this.setData({ statusInput: e.detail.value });
  },

  async onUpdate() {
    const { selectedId, statusInput } = this.data;
    if (!selectedId) {
      wx.showToast({ title: '请先选择订单', icon: 'none' });
      return;
    }
    const status = statusInput.trim();
    if (!status) {
      wx.showToast({ title: '请填写状态值', icon: 'none' });
      return;
    }
    this.setData({ updating: true });
    try {
      await request(`/admin/delivery/${selectedId}/status`, {
        method: 'POST',
        data: { status },
      });
      wx.showToast({ title: '状态已更新', icon: 'success' });
      this.setData({ selectedId: '' });
      void this.loadOrders();
    } catch (err: any) {
      wx.showToast({ title: err?.message || '更新失败', icon: 'none' });
    } finally {
      this.setData({ updating: false });
    }
  },
});
