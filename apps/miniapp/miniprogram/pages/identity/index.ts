import { getIdentities, getCurrentIdentity, switchIdentity } from '../../services/auth';
import { ROLE_NAMES } from '../../constants';

interface IdentityVO {
  id: string;
  roleCode: string;
  roleName: string;
  scopeDesc: string;
  active: boolean;
}

Page({
  data: {
    identities: [] as IdentityVO[],
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const current = getCurrentIdentity();
    const identities: IdentityVO[] = getIdentities().map((i) => ({
      id: i.id,
      roleCode: i.roleCode,
      roleName: ROLE_NAMES[i.roleCode] || i.roleCode,
      scopeDesc: i.shopId
        ? `花店 ${i.shopId}`
        : i.supplierId
          ? `批发商 ${i.supplierId}`
          : '个人身份',
      active: current?.id === i.id,
    }));
    this.setData({ identities });
  },

  async onSwitch(e: any) {
    const identityId = e.currentTarget.dataset.id as string;
    if (getCurrentIdentity()?.id === identityId) return;
    try {
      await switchIdentity(identityId);
      wx.showToast({ title: '切换成功', icon: 'success' });
      this.refresh();
    } catch (err: any) {
      wx.showToast({ title: err?.message || '切换失败', icon: 'none' });
    }
  },
});
