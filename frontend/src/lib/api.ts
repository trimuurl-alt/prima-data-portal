import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refresh = Cookies.get('refresh_token');
  if (!refresh) throw new Error('No refresh token');
  const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, { refreshToken: refresh });
  Cookies.set('access_token', data.accessToken, { sameSite: 'lax' });
  Cookies.set('refresh_token', data.refreshToken, { sameSite: 'lax' });
  return data.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as AxiosRequestConfig & { _retry?: boolean };
    const status = err.response?.status;
    const url = original?.url ?? '';
    if (status === 401 && !original._retry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      original._retry = true;
      try {
        if (!refreshPromise) refreshPromise = doRefresh();
        const token = await refreshPromise;
        refreshPromise = null;
        if (original.headers) original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        refreshPromise = null;
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  },
);
