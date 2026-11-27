import { bindPhone, wxLogin } from '../../services/auth';

Page({
  data: {
    loading: false,
    phoneHint: '',
  },

  async onLogin() {
    this.setData({ loading: true });
    try {
      const loginRes = await wx.login();
      const result = await wxLogin(loginRes.code);
      wx.showToast({ title: `已登录：${result.currentIdentity.roleCode}`, icon: 'success' });
      setTimeout(() => wx.reLaunch({ url: '/pages/mine/index' }), 600);
    } catch (err: any) {
      wx.showToast({ title: err?.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 手机号快速验证：需人工在小程序后台开通该组件 */
  async onGetPhoneNumber(e: any) {
    if (!e.detail?.code) {
      wx.showToast({ title: '已取消授权', icon: 'none' });
      return;
    }
    try {
      const res = await bindPhone(e.detail.code);
      this.setData({ phoneHint: `已绑定 ${res.phone}` });
      wx.showToast({ title: '绑定成功', icon: 'success' });
    } catch (err: any) {
      wx.showToast({ title: err?.message || '绑定失败', icon: 'none' });
    }
  },
});
