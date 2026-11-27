import { ROLE_NAMES } from '../../constants';
import { getCurrentIdentity, getIdentities, isLoggedIn } from '../../services/auth';

Page({
  data: {
    loggedIn: false,
    roleName: '未登录',
    roleCode: '',
    identityId: '',
    scopeDesc: '',
    identityCount: 0,
    showCustomerEntries: false,
    showPickerEntry: false,
    showDeliveryEntry: false,
    showStatementEntry: false,
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const loggedIn = isLoggedIn();
    const identity = getCurrentIdentity();
    const roleCode = identity?.roleCode || '';
    this.setData({
      loggedIn,
      roleName: identity ? ROLE_NAMES[roleCode] || roleCode : '未登录',
      roleCode,
      identityId: identity?.id ?? '',
      scopeDesc: identity?.shopId
        ? `花店 ${identity.shopId}`
        : identity?.supplierId
          ? `批发商 ${identity.supplierId}`
          : '个人身份',
      identityCount: getIdentities().length,
      showCustomerEntries: ['CUSTOMER', 'SHOP_MANAGER', 'SHOP_STAFF'].includes(roleCode),
      showPickerEntry: roleCode === 'SUPPLIER_PICKER',
      showDeliveryEntry: roleCode === 'DELIVERY_PERSON',
      showStatementEntry: ['SHOP_MANAGER', 'SHOP_STAFF', 'SUPPLIER_ADMIN'].includes(roleCode),
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/auth/index' });
  },

  goSwitch() {
    wx.navigateTo({ url: '/pages/identity/index' });
  },

  goShopApply() {
    wx.navigateTo({ url: '/pages/shop/index' });
  },

  goProducts() {
    wx.navigateTo({ url: '/pages/products/index' });
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/index' });
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/index' });
  },

  goScan() {
    wx.navigateTo({ url: '/pages/scan/index' });
  },

  goDelivery() {
    wx.navigateTo({ url: '/pages/delivery/index' });
  },

  goStatement() {
    wx.navigateTo({ url: '/pages/statement/index' });
  },
});
