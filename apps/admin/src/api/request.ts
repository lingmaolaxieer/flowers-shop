import axios from 'axios';
import { ElMessage } from 'element-plus';

/** 开发环境经 Vite 代理转发到 http://localhost:3000；生产环境由 Nginx 反代。 */
const request = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  ((response: import('axios').AxiosResponse) => {
    // 文件下载（responseType=blob）直接返回 Blob，不经过统一解包
    if (response.config.responseType === 'blob') return response.data;
    const body = response.data as { code: number; message: string; data: unknown };
    if (body.code === 0) return body.data;
    ElMessage.error(body.message || '请求失败');
    return Promise.reject(new Error(body.message));
  }) as (response: import('axios').AxiosResponse) => any,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    ElMessage.error(error.response?.data?.message || '网络异常');
    return Promise.reject(error);
  },
);

export default request;
