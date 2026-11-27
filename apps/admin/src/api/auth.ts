import request from './request';

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

/** 【内网测试登录】正式上线应替换为小程序扫码授权登录。 */
export async function webLogin(openid: string): Promise<LoginResult> {
  const res = (await request.post('/auth/web-login', { openid })) as LoginResult;
  localStorage.setItem('token', res.token);
  localStorage.setItem('refreshToken', res.refreshToken);
  localStorage.setItem('identities', JSON.stringify(res.identities));
  localStorage.setItem('currentIdentity', JSON.stringify(res.currentIdentity));
  return res;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function logout(): void {
  localStorage.clear();
}
