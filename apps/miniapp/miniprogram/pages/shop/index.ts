import { AUDIT_STATUS_NAMES } from '../../constants';
import { request } from '../../services/request';

interface ShopVO {
  id: string;
  name: string;
  auditStatus: string;
}

Page({
  data: {
    name: '',
    licenseNo: '',
    contactPhone: '',
    licenseImage: '',
    submitting: false,
    submitted: false,
    auditStatusName: '',
  },

  onLoad() {
    void this.loadMine();
  },

  async loadMine() {
    try {
      const shops = await request<ShopVO[]>('/shops/mine');
      if (shops.length > 0) {
        this.setData({
          submitted: true,
          auditStatusName: AUDIT_STATUS_NAMES[shops[0].auditStatus] || shops[0].auditStatus,
        });
      }
    } catch {
      // 未登录或网络异常时保持表单
    }
  },

  onNameInput(e: any) {
    this.setData({ name: e.detail.value });
  },
  onLicenseInput(e: any) {
    this.setData({ licenseNo: e.detail.value });
  },
  onPhoneInput(e: any) {
    this.setData({ contactPhone: e.detail.value });
  },

  async onSubmit() {
    const { name, licenseNo, contactPhone } = this.data;
    if (!name || !licenseNo || !contactPhone) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await request('/shops/apply', {
        method: 'POST',
        data: { name, licenseNo, contactPhone },
      });
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
      this.setData({ submitted: true, auditStatusName: '待审核' });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
