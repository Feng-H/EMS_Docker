import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const resolveDefaultBaseURL = () => {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured && typeof window === 'undefined') {
    return configured;
  }

  if (configured && typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalConfigured = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(configured);
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (!isLocalConfigured || isLocalHost) {
      return configured;
    }
    // 如果配置指向 localhost 但当前访问主机不是 localhost，则按当前主机重写
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}${port ? `:${port}` : ''}/api`;
  }

  return '/api';
};

const api = axios.create({
  baseURL: resolveDefaultBaseURL(),
  timeout: 10000,
});

if (typeof window !== 'undefined') {
  console.log('[EMS] API BaseURL:', api.defaults.baseURL);
}

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 如果是文件下载，直接返回响应
    if (response.config.responseType === 'blob' || response.headers['content-type']?.includes('application/vnd.openxmlformats')) {
      return response;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
