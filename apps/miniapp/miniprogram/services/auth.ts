import { request } from './request';

export interface Identity {
  id: string;
  roleCode: string;
  tenantId: string;
  supplierId: string | null;
  shopId: string | null;
}

interface LoginResult {
  token: string;
  refreshToken: string;
  currentIdentity: Identity;
  identities: Identity[];
}

interface SwitchResult {
  token: string;
  currentIdentity: Identity;
}

/** wx.login → 后端登录，落盘 token 与身份列表 */
export async function wxLogin(code: string): Promise<LoginResult> {
  const res = await request<LoginResult>('/auth/wx-login', {
    method: 'POST',
    data: { code },
  });
  wx.setStorageSync('token', res.token);
  wx.setStorageSync('refreshToken', res.refreshToken);
  wx.setStorageSync('identities', res.identities);
  wx.setStorageSync('currentIdentity', res.currentIdentity);
  return res;
}

/** 多身份切换：以新 scope 重新签发 token */
export async function switchIdentity(identityId: string): Promise<SwitchResult> {
  const res = await request<SwitchResult>('/auth/switch-identity', {
    method: 'POST',
    data: { identityId },
  });
  wx.setStorageSync('token', res.token);
  wx.setStorageSync('currentIdentity', res.currentIdentity);
  return res;
}

/** 绑定手机号（需小程序后台开通手机号快速验证组件） */
export async function bindPhone(code: string): Promise<{ phone: string }> {
  return request<{ phone: string }>('/auth/bind-phone', {
    method: 'POST',
    data: { code },
  });
}

export function getCurrentIdentity(): Identity | null {
  return (wx.getStorageSync('currentIdentity') as Identity) || null;
}

export function getIdentities(): Identity[] {
  return (wx.getStorageSync('identities') as Identity[]) || [];
}

export function isLoggedIn(): boolean {
  return Boolean(wx.getStorageSync('token'));
}
