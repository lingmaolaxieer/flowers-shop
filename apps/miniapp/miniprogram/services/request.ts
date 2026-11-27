import { BASE_URL } from '../constants';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
}

/**
 * 统一请求封装：自动携带 JWT、解包响应、401 跳登录。
 */
export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';
    wx.request({
      url: `${BASE_URL}${path}`,
      method: options.method ?? 'GET',
      data: options.data ?? {},
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      success(res) {
        const body = res.data as ApiResponse<T>;
        if (res.statusCode === 200 && body && body.code === 0) {
          resolve(body.data);
          return;
        }
        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.navigateTo({ url: '/pages/auth/index' });
        }
        reject(new Error(body?.message || `请求失败(${res.statusCode})`));
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络异常'));
      },
    });
  });
}
