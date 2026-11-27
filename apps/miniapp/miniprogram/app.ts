App({
  globalData: {
    token: '',
    identities: [],
    currentIdentity: null,
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) this.globalData.token = token;
  },
});
