import { request } from '../../services/request';
import { formatFen } from '../../utils/format';

interface StatementVO {
  id: string;
  shopName?: string;
  period?: string;
  status: string;
  /** 对账金额，单位：分 */
  amount?: number;
  createdAt?: string;
}

interface StatementVM extends StatementVO {
  amountText: string;
  statusName: string;
}

const STATEMENT_STATUS_NAMES: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
};

Page({
  data: {
    statements: [] as StatementVM[],
    loading: false,
    confirmingId: '',
  },

  onLoad() {
    void this.loadStatements();
  },

  onPullDownRefresh() {
    void this.loadStatements().finally(() => wx.stopPullDownRefresh());
  },

  async loadStatements() {
    this.setData({ loading: true });
    try {
      const list = await request<StatementVO[]>('/admin/settlement-statements');
      const statements: StatementVM[] = (list || []).map((s) => ({
        ...s,
        amountText: formatFen(s.amount),
        statusName: STATEMENT_STATUS_NAMES[s.status] || s.status,
      }));
      this.setData({ statements });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '对账单加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onConfirm(e: any) {
    const id = e.currentTarget.dataset.id as string;
    wx.showModal({
      title: '确认对账单',
      content: '确认后将无法修改，是否继续？',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ confirmingId: id });
        try {
          await request(`/admin/settlement-statements/${id}/confirm`, { method: 'POST' });
          wx.showToast({ title: '已确认', icon: 'success' });
          void this.loadStatements();
        } catch (err: any) {
          wx.showToast({ title: err?.message || '确认失败', icon: 'none' });
        } finally {
          this.setData({ confirmingId: '' });
        }
      },
    });
  },
});
